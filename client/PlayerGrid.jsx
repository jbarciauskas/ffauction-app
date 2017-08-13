import React, {Component} from "react";
import {AgGridReact} from "ag-grid-react";
import {Button, Grid, Row, Col, FormControl} from "react-bootstrap";


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
          'JAX': 8,
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
      event.data.purchase_price = parseFloat(event.data.purchase_price);
      localStorage.setItem("player-" + event.data.player_id, JSON.stringify({
        "purchase_price": event.data.purchase_price,
        "draft_team": event.data.draft_team,
      }));
      console.log(player);
      // bubble up
      this.props.onPlayerDataChange(event);
      this.gridApi.setRowData(this.props.rowData);
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
            {headerName: "Projected Points", field: "points", filter: "number", cellRenderer: formatNumber, sortingOrder: ['desc','asc']},
            {headerName: "Base Value ($)", field: "base_price", filter: "number", cellRenderer: formatNumber, sortingOrder: ['desc','asc']},
            {headerName: "Inf Value ($)", field: "inflated_price", filter: "number", cellRenderer: formatNumber, sort: 'desc', sortingOrder: ['desc','asc']},
            {headerName: "Purchase ($)", field: "purchase_price", filter: "number", cellRenderer: formatInt, sortingOrder: ['desc','asc'], editable: true, cellEditor: "text", onCellValueChanged:this.onPlayerDataChange},
            {headerName: "Drafted by", field: "draft_team", filter: "text", cellEditor: 'select', cellEditorParams: {'values':this.props.teamList}, editable: true, onCellValueChanged:this.onPlayerDataChange, cellRenderer:this.selectDropDownCellRenderer},
        ];
    }

    getRowStyle(params) {
      var player = params.data;
      if(player.hasOwnProperty('purchase_price') && !isNaN(player.purchase_price) && player.purchase_price !== null) {
        return {
          color: 'gray',
          "font-style": 'italic',
        };
      }
    }

    render() {
        let containerStyle = {
            height: "500px",
        };

        return (
            <div >
              <Row>
                <Col md={4}>
                  <FormControl style={{"margin-bottom":"5px"}} type="text"
                    onChange={this.onQuickFilterText.bind(this)}
                    placeholder="Type player name, position, or team to filter..."/>
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

function formatNumber(params) {
    let num = parseFloat(Math.round(params.value * 100) / 100).toFixed(2);
    if(isNaN(num) || num === null) {
      return "-";
    }
    else return num;
}
function formatInt(params) {
    let num = parseInt(params.value);
    if(isNaN(num) || num === null) {
      return '<i style="color: gray">Enter price...</i>';
    }
    else return num;
}
