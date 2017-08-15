import React, {Component} from "react";
import {AgGridReact} from "ag-grid-react";
import {Button, Grid, Row, Col, FormControl, Checkbox} from "react-bootstrap";


export default class extends Component {
    constructor(props) {
        super(props);

        this.byeWeeks = {
          'ATL': 5,
          'DEN': 5,
          'NO': 5,
          'WAS': 5,
          'BUF': 6,
          'CIN': 6,
          'DAL': 6,
          'SEA': 6,
          'DET': 7,
          'HOU': 7,
          'ARI': 8,
          'GB': 8,
          'JAC': 8,
          'LAR': 8,
          'NYG': 8,
          'TEN': 8,
          'CHI': 9,
          'CLE': 9,
          'LAC': 9,
          'MIN': 9,
          'NE': 9,
          'PIT': 9,
          'BAL': 10,
          'KC': 10,
          'OAK': 10,
          'PHI': 10,
          'CAR': 11,
          'IND': 11,
          'MIA': 11,
          'NYJ': 11,
          'SF': 11,
          'TB': 11,
        };

        this.clearFilters = this.clearFilters.bind(this);
        this.onHideUnavailablePlayers = this.onHideUnavailablePlayers.bind(this);
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
        player.draft_team = null;
        localStorage.removeItem("player-" + player.player_id);
      }
      else {
        localStorage.setItem("player-" + event.data.player_id, JSON.stringify({
          "purchase_price": player.purchase_price,
          "draft_team": player.draft_team,
          "keeper": player.keeper,
        }));
      }
      console.log(player);
      // bubble up
      this.props.onPlayerDataChange(event);
      setTimeout(() => {this.gridApi.setRowData(this.props.rowData)}, 0);
    }

    selectDropDownCellRenderer(params) {
      return (params.value ? params.value : "") + '<div class="pull-right"><span class="caret"/></div>';
    }

    lookupByeWeek(params) {
      return this.byeWeeks[params.value];
    }

    createColumnDefs() {
        return [
            {headerName: "Player name", field: "name", filter: "text"},
            {headerName: "Pos", field: "position", filter: "text", width: 100},
            {headerName: "Team", field: "team", filter: "text", width: 100},
            {headerName: "ByeWk", field: "team", filter: "number", cellRenderer: this.lookupByeWeek, width: 100},
            {headerName: "Projected Points", field: "points", filter: "number", cellRenderer: formatPoints, sortingOrder: ['desc','asc']},
            {headerName: "Base Value ($)", field: "base_price", filter: "number", cellRenderer: formatPriceFloat, sortingOrder: ['desc','asc']},
            {headerName: "Inf Value ($)", field: "inflated_price", filter: "number", cellRenderer: formatPriceFloat, sort: 'desc', sortingOrder: ['desc','asc']},
            {headerName: "Paid ($)", field: "purchase_price", filter: "number", cellRenderer: formatPurchasePrice, sortingOrder: ['desc','asc'], editable: true, cellEditor: "text", onCellValueChanged:this.onPlayerDataChange},
            {headerName: "Drafted by", field: "draft_team", filter: "text", cellEditor: 'select', cellEditorParams: {'values':this.props.teamList}, editable: true, onCellValueChanged:this.onPlayerDataChange, cellRenderer:this.selectDropDownCellRenderer},
            {headerName: "Keeper", field: "keeper", filter: "text", cellEditor: 'select', cellEditorParams: {'values':['Yes', 'No']}, editable: true, onCellValueChanged:this.onPlayerDataChange, cellRenderer:this.selectDropDownCellRenderer},
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
      console.log(purchasePriceFilter);
      purchasePriceFilter.setModel({
        type: 'equals',
        filter: 0,
        filterTo: null
      });
      purchasePriceFilter.onFilterChanged();
    }

    clearFilters(event) {
      this.gridApi.setFilterModel(null);
      this.gridApi.onFilterChanged();
    }

    render() {
        let containerStyle = {
            height: "500px",
        };

        return (
            <div >
              <Row>
                <Col md={4}>
                  <FormControl style={{marginBottom:"5px"}} type="text"
                    onChange={this.onQuickFilterText.bind(this)}
                    placeholder="Type player name, position, or team to filter..."/>
                </Col>
                <Col md={4}>
                  <Button inline onClick={this.onHideUnavailablePlayers}>Hide unavailable players</Button>
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
