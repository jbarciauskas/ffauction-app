import React, {Component} from "react";
import {AgGridReact} from "ag-grid-react";
import {Button, Grid, Row, Col, FormControl, Checkbox, Form, FormGroup, ControlLabel} from "react-bootstrap";
import {byeWeeks} from 'ByeWeeks';


export default class extends Component {
    constructor(props) {
        super(props);

        this.clearFilters = this.clearFilters.bind(this);
        this.onHideUnavailablePlayers = this.onHideUnavailablePlayers.bind(this);
        this.onHideZeroPoints = this.onHideZeroPoints.bind(this);
        this.onPlayerDataChange = this.onPlayerDataChange.bind(this);
        this.onGridReady = this.onGridReady.bind(this);
        this.getRowStyle = this.getRowStyle.bind(this);
        this.lookupByeWeek = this.lookupByeWeek.bind(this);
        this.getTeamOptions = this.getTeamOptions.bind(this);
        this.getNomineeFormStyle = this.getNomineeFormStyle.bind(this);
        this.state = {
            quickFilterText: null,
            nominatedPlayer: null,
            nominatedTeam: null,
            nominatedPrice: null,
            nominatedBase: null,
            nominatedInf: null,
            columnDefs: this.createColumnDefs()
        };
    }

    onGridReady(params) {
        this.gridApi = params.api;
        this.columnApi = params.columnApi;
        this.gridApi.sizeColumnsToFit();
    }

    onQuickFilterText(event) {
        this.setState({quickFilterText: event.target.value});
    }

    onNominatedPrice(event) {
        this.setState({nominatedPrice: event.target.value});
    }

    onNominatedTeam(event) {
        this.setState({nominatedTeam: event.target.value});
    }

    onPlayerDataChange(event) {
      let player = event.data;
      let changedCol = 'purchase_price';
      if(event.column) {
        changedCol = event.column.colId
      }
      player.purchase_price = parseFloat(player.purchase_price);
      if(player.purchase_price == null || player.purchase_price == 0 || isNaN(player.purchase_price)) {
        player.purchase_price = 0;
        if(changedCol == 'purchase_price') player.draft_team = null;
      }

      localStorage.setItem("player-" + event.data.player_id, JSON.stringify({
        "purchase_price": player.purchase_price,
        "draft_team": player.draft_team,
        "keeper": player.keeper,
        "note": player.note,
      }));

      // bubble up
      this.props.onPlayerDataChange(event);
      if(
          (changedCol == 'purchase_price' || changedCol == 'draft_team')
          && ((player.purchase_price == 0 && player.draft_team == null) || (player.purchase_price > 0 && player.draft_team != null))
          ) {
        setTimeout(() => {this.gridApi.setRowData(this.props.rowData)}, 0);
      }
    }

    selectDropDownCellRenderer(params) {
      return (params.value ? params.value : "") + '<div class="pull-right"><span class="caret"/></div>';
    }

    lookupByeWeek(params) {
      return byeWeeks[params.value];
    }

    createColumnDefs() {
        return [
            {headerName: "Player name", field: "name", filter: "text", filterParams: { newRowsAction: 'keep' } },
            {headerName: "Pos", field: "position", filter: "text", filterParams: { newRowsAction: 'keep' }, width: 100},
            {headerName: "Tier", field: "tier", filter: "text", filterParams: { newRowsAction: 'keep' }, sortingOrder: ['desc','asc'], width: 100},
            {headerName: "Team", field: "team", filter: "text", filterParams: { newRowsAction: 'keep' }, width: 100},
            {headerName: "Bye", field: "team", filter: "number", filterParams: { newRowsAction: 'keep' }, cellRenderer: this.lookupByeWeek, width: 100},
            {headerName: "Pts", field: "points", filter: "number", filterParams: { newRowsAction: 'keep' }, cellRenderer: formatPoints, sortingOrder: ['desc','asc'], width: 100},
            {headerName: "VOR", field: "avg_vbd", filter: "number", filterParams: { newRowsAction: 'keep' }, cellRenderer: formatPoints, sortingOrder: ['desc','asc'], width: 100},
            {headerName: "Base Value ($)", field: "base_price", filter: "number", filterParams: { newRowsAction: 'keep' }, cellRenderer: formatPriceFloat, sortingOrder: ['desc','asc'], width: 150},
            {headerName: "Inf Value ($)", field: "inflated_price", filter: "number", filterParams: { newRowsAction: 'keep' }, cellRenderer: formatPriceFloat, sort: 'desc', sortingOrder: ['desc','asc'], width: 150},
            {headerName: "Paid ($)", field: "purchase_price", filterParams: { newRowsAction: 'keep' }, filter: "number", cellRenderer: formatPurchasePrice, sortingOrder: ['desc','asc'], editable: true, cellEditor: "text", onCellValueChanged:this.onPlayerDataChange},
            {headerName: "Drafted by", field: "draft_team", filter: "text", filterParams: { newRowsAction: 'keep' }, cellEditor: 'select', cellEditorParams: {'values':this.props.teamList}, editable: true, onCellValueChanged:this.onPlayerDataChange, cellRenderer:this.selectDropDownCellRenderer},
            {headerName: "Keeper", field: "keeper", filter: "text", filterParams: { newRowsAction: 'keep' }, cellEditor: 'select', cellEditorParams: {'values':['Yes', 'No']}, editable: true, onCellValueChanged:this.onPlayerDataChange, cellRenderer:this.selectDropDownCellRenderer},
            {headerName: "Note", field: "note", filter: "text", filterParams: { newRowsAction: 'keep' }, cellEditor: 'select', cellEditorParams: {'values':['', 'Target', 'Sleeper', 'Avoid']}, editable: true, onCellValueChanged:this.onPlayerDataChange, cellRenderer:this.selectDropDownCellRenderer},
        ];
    }

    getRowStyle(params) {
      var player = params.data;
      if(player.purchase_price > 0) {
        return {
          color: 'gray',
          "font-style": 'italic',
        };
      }
    }

    onHideUnavailablePlayers(event) {
      var purchasePriceFilter = this.gridApi.getFilterInstance('purchase_price');
      if(purchasePriceFilter.getModel() == null) {
        purchasePriceFilter.setModel({
          type: 'equals',
          filter: 0,
          filterTo: null
        });
      }
      else {
        purchasePriceFilter.setModel(null);
      }
      purchasePriceFilter.onFilterChanged();
    }

    onHideZeroPoints(event) {
      var pointsFilter = this.gridApi.getFilterInstance('points');
      if(pointsFilter.getModel() == null) {
        pointsFilter.setModel({
          type: 'notEqual',
          filter: 0
        });
      }
      else {
        pointsFilter.setModel(null);
      }
      pointsFilter.onFilterChanged();
    }

    clearFilters(event) {
      document.getElementById('hide-unavailable-check').checked = false;
      document.getElementById('quick-text-filter').value = "";
      this.gridApi.setFilterModel(null);
      this.gridApi.onFilterChanged();
      this.setState({
        nominatedPlayer: null,
        nominatedPrice: null,
        nominatedBase: null,
        nominatedInf: null,
        nominatedTeam: null,
        quickFilterText: ''
      });
    }

    exportCSV(event) {
      this.gridApi.exportDataAsCsv();
    }

    togglePositionFilter(event, position) {
      var positionFilter = this.gridApi.getFilterInstance('position');
      var positionModel = positionFilter.getModel();
      if(positionModel == null || positionModel.filter.toLowerCase() != position.toLowerCase()) {
        positionFilter.setModel({
          type: 'equals',
          filter: position
        });
      }
      else {
        positionFilter.setModel(null);
      }
      positionFilter.onFilterChanged();
    }

    getTeamOptions(event) {
      let rows = [];
      this.props.teamList.forEach((team) => {
        rows.push(<option>{team}</option>);
      });
      return rows;
    }

    nominateSelected(event) {
      let rows = this.gridApi.getSelectedRows();
      let nominatedPlayer = null
      if(rows && rows.length > 0) {
        nominatedPlayer = rows[0];
      }
      this.setState({
        nominatedPlayer: nominatedPlayer,
        nominatedPrice: nominatedPlayer.purchase_price,
        nominatedTeam: nominatedPlayer.draft_team,
        nominatedBase: nominatedPlayer.base_price,
        nominatedInf: nominatedPlayer.inflated_price
      });
    }

    onSaveNominee(event) {
      if(this.state.nominatedPlayer) {
        this.state.nominatedPlayer.purchase_price = this.state.nominatedPrice;
        this.state.nominatedPlayer.draft_team = this.state.nominatedTeam;
        event.data = this.state.nominatedPlayer;
        this.setState({
          nominatedPlayer: null,
          nominatedPrice: null,
          nominatedTeam: null,
          nominatedBase: null,
          nominatedInf: null
        })
        this.onPlayerDataChange(event);
      }
    }

    getNomineeFormStyle() {
      if(this.state.nominatedPlayer == null) {
        return { display: 'none'};
      }
    }

    render() {
        let containerStyle = {
            height: "500px",
            minWidth: "800px"
        };

        return (
            <div >
              <Row>
                <Col md={3}>
                  <FormControl style={{marginBottom:"5px"}} type="text"
                    onChange={this.onQuickFilterText.bind(this)}
                    id="quick-text-filter"
                    placeholder="Enter player name, position, or team"/>
                </Col>
                <Col md={3}>
                  <Button inline onClick={this.clearFilters}>Clear</Button>{' '}
                  <Button inline onClick={this.nominateSelected.bind(this)}>Nominate selected</Button>
                </Col>
                <Col md={3}>
                  <Button inline onClick={((event) => { this.togglePositionFilter(event, 'QB'); }).bind(this)}>QBs</Button>
                  <Button inline onClick={((event) => { this.togglePositionFilter(event, 'RB'); }).bind(this)}>RBs</Button>
                  <Button inline onClick={((event) => { this.togglePositionFilter(event, 'WR'); }).bind(this)}>WRs</Button>
                  <Button inline onClick={((event) => { this.togglePositionFilter(event, 'TE'); }).bind(this)}>TEs</Button>
                </Col>
                <Col md={2}>
                  <Checkbox inline id="hide-unavailable-check" inline onChange={this.onHideUnavailablePlayers}>Hide drafted players</Checkbox>
                </Col>
                <Col md={1}>
                  <Button inline onClick={this.exportCSV.bind(this)}>Export</Button>
                </Col>
              </Row>
              <Row style={{marginBottom:"5px"}}>
              <Col md={11}>
              <div style={this.getNomineeFormStyle()}>
              <Form inline>
              <FormGroup controlId="formInlineNominee">
              <ControlLabel>Current nominee: {this.state.nominatedPlayer ? this.state.nominatedPlayer.name : ""}</ControlLabel>
                {' (Base value: $'}{Math.round(this.state.nominatedBase)}
                {', Inflated value: $'}{Math.round(this.state.nominatedInf)}{')'}
                {'  Actual $'}
                <FormControl type="text"
                  style={{width:"50px"}}
                  bsSize="sm"
                  id="nominated-player-price"
                  placeholder="$ paid"
                  onChange={this.onNominatedPrice.bind(this)}
                  value={this.state.nominatedPrice}/>{' '}
                <FormControl componentClass="select"
                  id="nominated-player-team"
                  placeholder="Team"
                  onChange={this.onNominatedTeam.bind(this)}
                  value={this.state.nominatedTeam}
                  >
                  {this.getTeamOptions()}
                </FormControl>{' '}
                <Button inline onClick={((event) => { this.onSaveNominee(event)}).bind(this)}>Save</Button>
              </FormGroup>
              </Form>
              </div>
              </Col>
              </Row>
              <Row>
              <Col md={12} >

              <div style={containerStyle} className="ag-fresh">
                <AgGridReact
                    // properties
                    columnDefs={this.state.columnDefs}
                    rowData={this.props.rowData}
                    quickFilterText={this.state.quickFilterText}
                    rowSelection="single"

                    enableSorting
                    enableFilter
                    singleClickEdit
                    suppressDragLeaveHidesColumns
                    stopEditingWhenGridLosesFocus
                    getRowStyle={this.getRowStyle}

                    // events
                    onGridReady={this.onGridReady}
                    >
                </AgGridReact>
                </div>
                </Col>
                </Row>
                </div>
        )
    }
}

function formatPoints(params) {
    let num = parseFloat(Math.round(params.value * 100) / 100).toFixed(2);
    if(isNaN(num) || num === null) {
      return 0;
    }
    else {
      return '<span class="pull-right" style="padding-right: 2px">' + num + '</span>';
    }
}
function formatPriceFloat(params) {
    let num = Math.round(params.value);
    if(isNaN(num) || num === null) {
      return "-";
    }
    else {
      return '<span class="pull-right" style="padding-right: 2px">$' + num + '</span>';
    }
}
function formatPurchasePrice(params) {
    let num = parseInt(params.value);
    if(isNaN(num) || num === null || num == 0) {
      return '<i style="color: gray; padding-left: 5px">Enter price...</i>';
    }
    else {
      return '<span class="pull-right" style="padding-right: 5px">$' + num + '</span>';
    }
}
