import React, {Component} from "react";
import {AgGridReact} from "ag-grid-react";
import {Button, Grid, Row, Col, FormControl, Checkbox} from "react-bootstrap";
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
        this.state = {
            quickFilterText: null,
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

    onPlayerDataChange(event) {
      let player = event.data;
      player.purchase_price = parseFloat(player.purchase_price);
      if(player.purchase_price == null || player.purchase_price == 0 || isNaN(player.purchase_price)) {
        player.purchase_price = 0;
        if(event.column.colId == 'purchase_price') player.draft_team = null;
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
          (event.column.colId == 'purchase_price' || event.column.colId == 'draft_team')
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
        event.target.innerText = 'Show unavailable players';
      }
      else {
        purchasePriceFilter.setModel(null);
        event.target.innerText = 'Hide unavailable players';
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
        event.target.innerText = 'Show players with 0 proj. pts';
      }
      else {
        pointsFilter.setModel(null);
        event.target.innerText = 'Hide players with 0 proj. pts';
      }
      pointsFilter.onFilterChanged();
    }

    clearFilters(event) {
      this.gridApi.setFilterModel(null);
      this.gridApi.onFilterChanged();
    }

    render() {
        let containerStyle = {
            height: "500px",
            minWidth: "800px"
        };

        return (
            <div >
              <Row>
                <Col md={4}>
                  <FormControl style={{marginBottom:"5px"}} type="text"
                    onChange={this.onQuickFilterText.bind(this)}
                    placeholder="Type player name, position, or team to filter..."/>
                </Col>
                <Col md={8}>
                  <Button inline onClick={this.onHideUnavailablePlayers}>Hide unavailable players</Button>
                  {' '}
                  <Button inline onClick={this.onHideZeroPoints}>Hide players with 0 proj. pts</Button>
                  {' '}
                  <Button inline onClick={this.clearFilters}>Clear filters</Button>
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
    let num = parseFloat(Math.round(params.value * 100) / 100).toFixed(2);
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
