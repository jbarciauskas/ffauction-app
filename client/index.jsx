'use strict';

import React from "react";
import ReactDOM from 'react-dom';
import axios from 'axios';
import {Checkbox,Accordion,Panel,Navbar,Nav,NavItem,Button,Grid,Row,Col,ControlLabel,FormControl,FormGroup,Form,Modal,OverlayTrigger,Popover,Tabs,Tab,Table,Tooltip} from 'react-bootstrap';


// pull in the ag-grid styles we're interested in
import "ag-grid/dist/styles/ag-grid.css";
import "ag-grid/dist/styles/theme-fresh.css";

// our application
import PlayerGrid from "./PlayerGrid";

class App extends React.Component {
  constructor() {
    super();
    this.leagueSettings = localStorage.getItem('leagueSettings');
    if(!this.leagueSettings) {
      this.leagueSettings = {
          "num_teams": 12,
          "team_budget": 200,
          "flex_type": "rb/wr/te",
          "starter_budget_pct": 0.88,
          "roster": {
              "qb": 1,
              "rb": 2,
              "wr": 2,
              "te": 1,
              "flex": 1,
              "team_def": 1,
              "k": 1,
              "bench": 6
          },
          "scoring": {
              "passAtt": 0,
              "passComp": 0,
              "passYds": 25,
              "passTds": 4,
              "twoPts": 2,
              "sacks": 0,
              "passInt": -1,
              "rushAtt": 0,
              "rushYds": 10,
              "rushTds": 6,
              "rec": 0,
              "recYds": 10,
              "recTds": 6,
              "fumbles": -2
          },
          "override_bench": false,
          "override_bench_allocation": {}
      };
    }
    else this.leagueSettings = JSON.parse(this.leagueSettings);
    if(!this.leagueSettings.hasOwnProperty('override_bench')) {
      this.leagueSettings['override_bench'] = false;
    }

    if(!this.teamList) {
      this.teamList = [];
      for(var i = 0; i < this.leagueSettings.num_teams; i++) {
        this.teamList.push("Team #" + (i + 1));
      }
    }

    let startingBudget = ((this.leagueSettings.num_teams * this.leagueSettings.team_budget)
      - (this.leagueSettings.roster.k * this.leagueSettings.num_teams
          + this.leagueSettings.roster.team_def * this.leagueSettings.num_teams));
    let currentDraftStatus = calcCurrentDraftStatus([], startingBudget, this.teamList, this.leagueSettings);
    this.state = {
      currentDraftStatus: currentDraftStatus,
      startingBudget: startingBudget,
      rowData: [],
      showModal: false,
      leagueSettings: this.leagueSettings,
      teamList: this.teamList,
    };

    this.getPlayersOnMyTeam = this.getPlayersOnMyTeam.bind(this);
    this.getMyTeamTable = this.getMyTeamTable.bind(this);
    this.getMaxBid = this.getMaxBid.bind(this);
    this.restartAuction = this.restartAuction.bind(this);
    this.resetKeepers = this.resetKeepers.bind(this);
    this.onPlayerDataChange = this.onPlayerDataChange.bind(this);
    this.onTeamNameChange = this.onTeamNameChange.bind(this);
    this.getTeamRow = this.getTeamRow.bind(this);
    this.getTeamRows = this.getTeamRows.bind(this);
    this.close = this.close.bind(this);
    this.open = this.open.bind(this);
    this.onSettingsChange = this.onSettingsChange.bind(this);
    this.saveSettings = this.saveSettings.bind(this);
    this.saveSettings();
  }

  onPlayerDataChange() {
    let currentDraftStatus = calcCurrentDraftStatus(this.state.rowData, this.state.startingBudget, this.state.teamList, this.state.leagueSettings);
    this.setState({
      rowData: this.state.rowData,
      currentDraftStatus: currentDraftStatus,
    });
  }

  saveSettings() {
    this.state.startingBudget = ((this.leagueSettings.num_teams * this.leagueSettings.team_budget)
      - (this.leagueSettings.roster.k * this.leagueSettings.num_teams
          + this.leagueSettings.roster.team_def * this.leagueSettings.num_teams));

    var num_teams_change = this.leagueSettings.num_teams - this.state.teamList.length;
    if(num_teams_change > 0) {
      for(var i = 0; i < num_teams_change; i++) {
        this.state.teamList.push("");
      }
    }
    else if(num_teams_change < 0) {
      for(var i = num_teams_change; i < 0; i++) {
        this.state.teamList.pop();
      }
    }

    this.state.showModal = false;

    axios.post(`/api/players`, this.leagueSettings)
    .then(res => {
      let currentDraftStatus = calcCurrentDraftStatus(mergeSavedData(res.data), this.state.startingBudget, this.state.teamList, this.state.leagueSettings);
      this.setState({
        startingBudget: this.state.startingBudget,
        rowData: res.data,
        currentDraftStatus: currentDraftStatus,
        showModal: this.state.showModal
      });
    });
    localStorage.setItem('leagueSettings', JSON.stringify(this.leagueSettings));
  }

  close() {
    this.setState({ showModal: false });
  }

  open() {
    this.setState({ showModal: true });
  }

  formatInflationRate(rate) {
    return (rate*100).toFixed(2) + "%";
  }

  onSettingsChange(e) {
    if(e.target.id == 'num_teams') this.leagueSettings.num_teams = parseInt(e.target.value);
    else if(e.target.id == 'team_budget') this.leagueSettings.team_budget = parseInt(e.target.value);
    else if(e.target.id == 'starter_budget_pct') this.leagueSettings.starter_budget_pct = parseFloat(e.target.value/100);
    else if(e.target.id == 'roster[qb]') this.leagueSettings.roster.qb = parseInt(e.target.value);
    else if(e.target.id == 'roster[rb]') this.leagueSettings.roster.rb = parseInt(e.target.value);
    else if(e.target.id == 'roster[wr]') this.leagueSettings.roster.wr = parseInt(e.target.value);
    else if(e.target.id == 'roster[te]') this.leagueSettings.roster.te = parseInt(e.target.value);
    else if(e.target.id == 'roster[flex]') this.leagueSettings.roster.flex = parseInt(e.target.value);
    else if(e.target.id == 'roster[k]') this.leagueSettings.roster.k = parseInt(e.target.value);
    else if(e.target.id == 'roster[team_def]') this.leagueSettings.roster.team_def = parseInt(e.target.value);
    else if(e.target.id == 'roster[bench]') this.leagueSettings.roster.bench = parseInt(e.target.value);
    else if(e.target.id == 'scoring[passYds]') this.leagueSettings.scoring.passYds = parseInt(e.target.value);
    else if(e.target.id == 'scoring[passComp]') this.leagueSettings.scoring.passComp = parseFloat(e.target.value);
    else if(e.target.id == 'scoring[passTds]') this.leagueSettings.scoring.passTds = parseInt(e.target.value);
    else if(e.target.id == 'scoring[sacks]') this.leagueSettings.scoring.sacks = parseFloat(e.target.value);
    else if(e.target.id == 'scoring[passInt]') this.leagueSettings.scoring.passInt = parseFloat(e.target.value);
    else if(e.target.id == 'scoring[rushYds]') this.leagueSettings.scoring.rushYds = parseInt(e.target.value);
    else if(e.target.id == 'scoring[rushTds]') this.leagueSettings.scoring.rushTds = parseInt(e.target.value);
    else if(e.target.id == 'scoring[rushAtt]') this.leagueSettings.scoring.rushAtt = parseFloat(e.target.value);
    else if(e.target.id == 'scoring[fumbles]') this.leagueSettings.scoring.fumbles = parseFloat(e.target.value);
    else if(e.target.id == 'scoring[recYds]') this.leagueSettings.scoring.recYds = parseInt(e.target.value);
    else if(e.target.id == 'scoring[recTds]') this.leagueSettings.scoring.recTds = parseFloat(e.target.value);
    else if(e.target.id == 'scoring[rec]') this.leagueSettings.scoring.rec = parseFloat(e.target.value);
    else if(e.target.id == 'scoring[twoPts]') this.leagueSettings.scoring.twoPts = parseFloat(e.target.value);
    else if(e.target.id == 'overrideBench') this.leagueSettings.override_bench = e.target.checked;
    else if(e.target.id == 'benchSpots[qb]') this.leagueSettings.override_bench_allocation['QB'] = parseInt(e.target.value);
    else if(e.target.id == 'benchSpots[rb]') this.leagueSettings.override_bench_allocation['RB'] = parseInt(e.target.value);
    else if(e.target.id == 'benchSpots[wr]') this.leagueSettings.override_bench_allocation['WR'] = parseInt(e.target.value);
    else if(e.target.id == 'benchSpots[te]') this.leagueSettings.override_bench_allocation['TE'] = parseInt(e.target.value);
    this.setState({
      leagueSettings: this.leagueSettings
    });
    console.log(this.leagueSettings);
  }

  getTeamRow(i) {
    var teamControlId = "team." + i;
    var yourTeamNote = ""
    if(i == 0) yourTeamNote = <i>(your team)</i>;
    return <Row style={{paddingBottom: "5px"}} key={teamControlId}>
      <FormGroup controlId={teamControlId}>
        <Col md={3}>
          <ControlLabel >Team #{i+1}</ControlLabel> {' '}{yourTeamNote}
        </Col>
        <Col md={4}>
          <FormControl type="text" placeholder="Team name..." value={this.state.teamList[i]} onChange={this.onTeamNameChange}/>
        </Col>
        </FormGroup>
    </Row>;
  }

  getTeamRows(num_teams) {
    let teamListComponents = [];

    for(var i=0; i < this.leagueSettings.num_teams; i++) {
      teamListComponents.push(this.getTeamRow(i));
    }
    return teamListComponents;
  }

  onTeamNameChange(e) {
    var teamId = parseInt(e.target.id.replace("team.",""));
    this.state.teamList[teamId] = e.target.value;
    this.setState({
      teamList: this.state.teamList,
    });
  }

  getBestAvailable(currentDraftStatus, position, index, property) {
    if(currentDraftStatus.hasOwnProperty('nextBest')
        && currentDraftStatus.nextBest.hasOwnProperty(position)
        && currentDraftStatus.nextBest[position].length > 0) {
      var value = currentDraftStatus.nextBest[position][index][property];
      if(parseFloat(value)) return parseFloat(Math.round(value * 100) / 100).toFixed(2);
      else return value;
    }
  }

  getBestAvailableDrop(currentDraftStatus, position) {
    if(currentDraftStatus.hasOwnProperty('nextBest')
        && currentDraftStatus.nextBest.hasOwnProperty(position)
        && currentDraftStatus.nextBest[position].length > 0) {
      var value = currentDraftStatus.nextBest[position][0].inflated_price - currentDraftStatus.nextBest[position][1].inflated_price;
      value = value / currentDraftStatus.nextBest[position][0].inflated_price;
      return (parseFloat(value) * 100).toFixed(2) + "%";
    }
  }

  getDropOffCellClass(val) {
    if(parseFloat(val) > 40) return 'danger';
    else if(parseFloat(val) > 20) return 'warning';
  }

  resetKeepers(event) {
    var doubleCheck = confirm("Are you sure you want to clear price data and reset keepers?");
    if(doubleCheck) {
      this.state.rowData.forEach((player) => {
        if(player.hasOwnProperty('keeper') && player.keeper == 'Yes') {
          player.purchase_price = 0;
          player.draft_team = null;
          player.keeper = 'No';
          localStorage.removeItem("player-" + player.player_id);
        }
      });
      this.onPlayerDataChange();
      this.saveSettings();
    }
  }

  restartAuction(event) {
    var doubleCheck = confirm("Are you sure you want to clear price data and restart the auction?");
    if(doubleCheck) {
      this.state.rowData.forEach((player) => {
        if(player.hasOwnProperty('keeper') && player.keeper == 'Yes') {
        }
        else {
          player.purchase_price = 0;
          player.draft_team = null;
          localStorage.removeItem("player-" + player.player_id);
        }
      });
      this.onPlayerDataChange();
      this.saveSettings();
    }
  }

  getMaxBid() {
    var totalRosterSize = this.state.leagueSettings.roster.qb
      + this.state.leagueSettings.roster.rb
      + this.state.leagueSettings.roster.wr
      + this.state.leagueSettings.roster.te
      + this.state.leagueSettings.roster.k
      + this.state.leagueSettings.roster.team_def
      + this.state.leagueSettings.roster.bench;

    return this.state.leagueSettings.team_budget
      - this.state.currentDraftStatus.mySpentBudget
      - (totalRosterSize - this.state.currentDraftStatus.currentRosterLength);
  }

  getPlayerCell(player, points) {
    return <tr key={"my-team-row-" + player.player_id}>
      <td>{player.name}</td>
      <td><span className="pull-right">{points}</span></td>
      <td><span className="pull-right">${player.purchase_price}</span></td>
    </tr>;
  }

  getPlayersOnMyTeam(position) {
    let rosterByPosition = this.state.currentDraftStatus.rosterByPosition;
    let rows = [];
    rosterByPosition[position].forEach((player) => {
      let points = parseFloat(Math.round(player.points * 100) / 100).toFixed(2);
      rows.push(this.getPlayerCell(player, points));
    });

    return rows;
  }

  getMyTeamTable(position) {
    var positionName = "";
    if(position == 'bench') positionName = 'Bench';
    else if(position == 'flex') positionName = 'Flex';
    else positionName = position;
    const headerStyle = {
      backgroundColor: 'gray',
      color: 'white'
    };
    return <Col md={3}>
      <Table striped bordered condensed>
        <thead style={headerStyle}>
          <tr>
            <th>{positionName}</th>
            <th>Points</th> 
            <th>Price</th> 
          </tr>
        </thead>
        <tbody>
        {this.getPlayersOnMyTeam(position)}
        </tbody>
      </Table>
    </Col>;
  }



  render() {
    const popover = (
      <Popover id="modal-popover" title="popover">
        very popover. such engagement
      </Popover>
    );
    const tooltip = (
      <Tooltip id="modal-tooltip">
        wow.
      </Tooltip>
    );
    let tabPadding = {
        paddingTop: "2rem",
    };

    let teamListComponents = [];
    return (
        <Grid>
          <Navbar inverse>
            <Navbar.Header>
              <Navbar.Brand>
                <a href="#">FFAuctionDraft</a>
              </Navbar.Brand>
            </Navbar.Header>
            <Nav>
              <NavItem eventKey={1} href="#" onClick={this.open}>Configure league</NavItem>
              <NavItem eventKey={2} href="#" onClick={this.restartAuction}>Restart auction</NavItem>
              <NavItem eventKey={3} href="#" onClick={this.resetKeepers}>Reset keepers</NavItem>
            </Nav>
          </Navbar>
          <Row>
            <Col md={12}>
              <h1>Draft board</h1>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
            <p><i>Value-based draft logic provided by <a href="https://reddit.com/u/elboberto">elboberto</a>! More details available at the <a href="https://www.reddit.com/r/fantasyfootball/comments/6shrc7/elbobertos_custom_auction_value_generator_2017/">v1.0 2017 reddit thread</a></i></p>
            </Col>
          </Row>
          <Accordion defaultActiveKey="1">
            <Panel header="Draft details" eventKey="1">
            <Row>
              <Col md={3}>
              <Row>
              <Col md={12}>
              Inflation rate: <b>{this.formatInflationRate(this.state.currentDraftStatus.inflationRate)}</b>
              </Col>
              <Col md={12}>
              My remaining budget: <b>${this.state.leagueSettings.team_budget - this.state.currentDraftStatus.mySpentBudget}</b>
              </Col>
              <Col md={12}>
              Max bid: <b>${this.getMaxBid()}</b>
              </Col>
              </Row>
              </Col>
              <Col md={9}>
              <Table striped bordered condensed hover>
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Best available</th>
                  <th>Value</th>
                  <th>Next best</th>
                  <th>Value</th>
                  <th>Dropoff (%)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>QB</td>
                  <td>{this.getBestAvailable(this.state.currentDraftStatus, 'qb', 0, 'name')}</td>
                  <td>{this.getBestAvailable(this.state.currentDraftStatus, 'qb', 0, 'inflated_price')}</td>
                  <td>{this.getBestAvailable(this.state.currentDraftStatus, 'qb', 1, 'name')}</td>
                  <td>{this.getBestAvailable(this.state.currentDraftStatus, 'qb', 1, 'inflated_price')}</td>
                  <td className={this.getDropOffCellClass(this.getBestAvailableDrop(this.state.currentDraftStatus, 'qb'))}>
                    {this.getBestAvailableDrop(this.state.currentDraftStatus, 'qb')}
                  </td>
                </tr>
                <tr>
                  <td>RB</td>
                  <td>{this.getBestAvailable(this.state.currentDraftStatus, 'rb', 0, 'name')}</td>
                  <td>{this.getBestAvailable(this.state.currentDraftStatus, 'rb', 0, 'inflated_price')}</td>
                  <td>{this.getBestAvailable(this.state.currentDraftStatus, 'rb', 1, 'name')}</td>
                  <td>{this.getBestAvailable(this.state.currentDraftStatus, 'rb', 1, 'inflated_price')}</td>
                  <td className={this.getDropOffCellClass(this.getBestAvailableDrop(this.state.currentDraftStatus, 'rb'))}>
                    {this.getBestAvailableDrop(this.state.currentDraftStatus, 'rb')}
                  </td>
                </tr>
                <tr>
                  <td>WR</td>
                  <td>{this.getBestAvailable(this.state.currentDraftStatus, 'wr', 0, 'name')}</td>
                  <td>{this.getBestAvailable(this.state.currentDraftStatus, 'wr', 0, 'inflated_price')}</td>
                  <td>{this.getBestAvailable(this.state.currentDraftStatus, 'wr', 1, 'name')}</td>
                  <td>{this.getBestAvailable(this.state.currentDraftStatus, 'wr', 1, 'inflated_price')}</td>
                  <td className={this.getDropOffCellClass(this.getBestAvailableDrop(this.state.currentDraftStatus, 'wr'))}>
                    {this.getBestAvailableDrop(this.state.currentDraftStatus, 'wr')}
                  </td>
                </tr>
                <tr>
                  <td>TE</td>
                  <td>{this.getBestAvailable(this.state.currentDraftStatus, 'te', 0, 'name')}</td>
                  <td>{this.getBestAvailable(this.state.currentDraftStatus, 'te', 0, 'inflated_price')}</td>
                  <td>{this.getBestAvailable(this.state.currentDraftStatus, 'te', 1, 'name')}</td>
                  <td>{this.getBestAvailable(this.state.currentDraftStatus, 'te', 1, 'inflated_price')}</td>
                  <td className={this.getDropOffCellClass(this.getBestAvailableDrop(this.state.currentDraftStatus, 'te'))}>
                    {this.getBestAvailableDrop(this.state.currentDraftStatus, 'te')}
                  </td>
                </tr>
                </tbody>
                </Table>
              </Col>
            </Row>
            </Panel>
            <Panel header="My team" eventKey="2">
            <Row>
            {this.getMyTeamTable('QB')}
            {this.getMyTeamTable('RB')}
            {this.getMyTeamTable('WR')}
            {this.getMyTeamTable('TE')}
            </Row>
            <Row>
            {this.getMyTeamTable('flex')}
            {this.getMyTeamTable('bench')}
            {this.getMyTeamTable('K')}
            {this.getMyTeamTable('DST')}
            </Row>
            </Panel>
          </Accordion>

          <Modal show={this.state.showModal} onHide={this.close}>
          <Modal.Header closeButton>
            <Modal.Title>League settings</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
                <Tabs defaultActiveKey={1}>
                <Tab eventKey={1} title="Auction settings" style={tabPadding}>
                  <Row>
                    <Col xs={2}>
                      <FormGroup controlId="num_teams">
                        <ControlLabel >Teams</ControlLabel>
                        <FormControl type="number" placeholder="12" value={this.state.leagueSettings.num_teams} onChange={this.onSettingsChange}/>
                      </FormGroup>
                    </Col>
                    <Col xs={2}>
                      <FormGroup controlId="team_budget">
                        <ControlLabel >Budget</ControlLabel>
                        <FormControl type="number" placeholder="200" value={this.state.leagueSettings.team_budget} onChange={this.onSettingsChange}/>
                      </FormGroup>
                    </Col>
                    <Col xs={3}>
                      <FormGroup controlId="starter_budget_pct">
                        <ControlLabel >Starter Budget %</ControlLabel>
                        <FormControl type="number" value={this.state.leagueSettings.starter_budget_pct * 100} onChange={this.onSettingsChange} />
                      </FormGroup>
                    </Col>
                  </Row>
                </Tab>
                <Tab eventKey={2} title="Roster settings" style={tabPadding}>
                <h4>Starters</h4>
                <Row>
                  <Col xs={2}>
                    <FormGroup controlId="roster[qb]">
                      <ControlLabel >QBs</ControlLabel>
                      <FormControl type="number" placeholder="1" value={this.state.leagueSettings.roster.qb} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                  <Col xs={2}>
                    <FormGroup controlId="roster[rb]">
                      <ControlLabel >RBs</ControlLabel>
                      <FormControl type="number" placeholder="2" value={this.state.leagueSettings.roster.rb} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                  <Col xs={2}>
                    <FormGroup controlId="roster[wr]">
                      <ControlLabel >WRs</ControlLabel>
                      <FormControl type="number" placeholder="2" value={this.state.leagueSettings.roster.wr} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                  <Col xs={2}>
                    <FormGroup controlId="roster[te]">
                      <ControlLabel >TEs</ControlLabel>
                      <FormControl type="number" placeholder="1" value={this.state.leagueSettings.roster.te} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                  <Col xs={2}>
                    <FormGroup controlId="roster[flex]">
                      <ControlLabel >Flex</ControlLabel>
                      <FormControl type="number" placeholder="1" value={this.state.leagueSettings.roster.flex} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                  </Row>
                  <Row>
                  <Col xs={2}>
                    <FormGroup controlId="roster[k]">
                      <ControlLabel >Kickers</ControlLabel>
                      <FormControl type="number" placeholder="1" value={this.state.leagueSettings.roster.k} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                  <Col xs={2}>
                    <FormGroup controlId="roster[team_def]">
                      <ControlLabel >Def</ControlLabel>
                      <FormControl type="number" placeholder="1" value={this.state.leagueSettings.roster.team_def} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                  <Col xs={2}>
                    <FormGroup controlId="roster[bench]">
                      <ControlLabel >Bench</ControlLabel>
                      <FormControl type="number" placeholder="6" value={this.state.leagueSettings.roster.bench} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                </Row>
                <h4>Allocate bench</h4>
                <Row>
                  <Col md={12}>
                    <FormGroup controlId="overrideBench">
                      <Checkbox style={{verticalAlign: "top"}} inline id="overrideBench" checked={this.state.leagueSettings.override_bench} onChange={this.onSettingsChange}/>
                      <ControlLabel inline>Manually allocate bench spots?</ControlLabel>
                    </FormGroup>
                  </Col>
                </Row>
                <Row>
                  <Col xs={2}>
                    <FormGroup controlId="benchSpots[qb]">
                      <ControlLabel >QBs</ControlLabel>
                      <FormControl type="number" placeholder="1" value={this.state.leagueSettings.override_bench_allocation.QB} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                  <Col xs={2}>
                    <FormGroup controlId="benchSpots[rb]">
                      <ControlLabel >RBs</ControlLabel>
                      <FormControl type="number" placeholder="2" value={this.state.leagueSettings.override_bench_allocation.RB} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                  <Col xs={2}>
                    <FormGroup controlId="benchSpots[wr]">
                      <ControlLabel >WRs</ControlLabel>
                      <FormControl type="number" placeholder="2" value={this.state.leagueSettings.override_bench_allocation.WR} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                  <Col xs={2}>
                    <FormGroup controlId="benchSpots[te]">
                      <ControlLabel >TEs</ControlLabel>
                      <FormControl type="number" placeholder="1" value={this.state.leagueSettings.override_bench_allocation.TE} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                 </Row>
                </Tab>
                <Tab eventKey={3} title="Scoring settings" style={tabPadding}>
                <h4>Passing</h4>
                <Row>
                  <Col xs={2}>
                    <FormGroup controlId="scoring[passYds]">
                      <ControlLabel >Yards/point</ControlLabel>
                      <FormControl type="number" placeholder="25" value={this.state.leagueSettings.scoring.passYds} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                  <Col xs={2}>
                    <FormGroup controlId="scoring[passTds]">
                      <ControlLabel >TDs</ControlLabel>
                      <FormControl type="number" placeholder="4" value={this.state.leagueSettings.scoring.passTds} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                  <Col xs={2}>
                    <FormGroup controlId="scoring[passComp]">
                      <ControlLabel >Completions</ControlLabel>
                      <FormControl type="number" placeholder="0" step="0.05" value={this.state.leagueSettings.scoring.passComp} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                   <Col xs={2}>
                    <FormGroup controlId="scoring[sacks]">
                      <ControlLabel >Sacks</ControlLabel>
                      <FormControl type="number" placeholder="0" step="0.5" value={this.state.leagueSettings.scoring.sacks} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                   <Col xs={2}>
                    <FormGroup controlId="scoring[passInt]">
                      <ControlLabel >Pass Ints</ControlLabel>
                      <FormControl type="number" placeholder="-1" step="0.5" value={this.state.leagueSettings.scoring.passInt} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                </Row>
                <h4>Rushing</h4>
                <Row>
                  <Col xs={2}>
                    <FormGroup controlId="scoring[rushYds]">
                      <ControlLabel >Yards/point</ControlLabel>
                      <FormControl type="number" placeholder="10" value={this.state.leagueSettings.scoring.rushYds} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                  <Col xs={2}>
                    <FormGroup controlId="scoring[rushTds]">
                      <ControlLabel >TDs</ControlLabel>
                      <FormControl type="number" placeholder="6" value={this.state.leagueSettings.scoring.rushTds} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                  <Col xs={2}>
                    <FormGroup controlId="scoring[rushAtt]">
                      <ControlLabel >Attempts</ControlLabel>
                      <FormControl type="number" placeholder="0" value={this.state.leagueSettings.scoring.rushAtt} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                  <Col xs={2}>
                    <FormGroup controlId="scoring[fumbles]">
                      <ControlLabel >Fumbles</ControlLabel>
                      <FormControl type="number" placeholder="-2" step="0.5" value={this.state.leagueSettings.scoring.fumbles} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                </Row>
                <h4>Receiving</h4>
                <Row>
                  <Col xs={2}>
                    <FormGroup controlId="scoring[recYds]">
                      <ControlLabel >Yards/point</ControlLabel>
                      <FormControl type="number" placeholder="10" value={this.state.leagueSettings.scoring.recYds} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                  <Col xs={2}>
                    <FormGroup controlId="scoring[recTds]">
                      <ControlLabel >TDs</ControlLabel>
                      <FormControl type="number" placeholder="6" value={this.state.leagueSettings.scoring.recTds} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                  <Col xs={2}>
                    <FormGroup controlId="scoring[rec]">
                      <ControlLabel >Receptions</ControlLabel>
                      <FormControl type="number" placeholder="0" step="0.5" value={this.state.leagueSettings.scoring.rec} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                </Row>
                <h4>Other</h4>
                <Row>
                  <Col xs={2}>
                    <FormGroup controlId="scoring[twoPts]">
                      <ControlLabel >2pts</ControlLabel>
                      <FormControl type="number" placeholder="2" value={this.state.leagueSettings.scoring.twoPts} onChange={this.onSettingsChange}/>
                    </FormGroup>
                  </Col>
                </Row>
                </Tab>
                <Tab eventKey={4} title="Teams" style={tabPadding}>
                  <h4>Team list</h4>
                  {this.getTeamRows(this.state.leagueSettings.num_teams)}
                </Tab>
                </Tabs>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.saveSettings}>Save and update prices</Button>
          </Modal.Footer>
        </Modal>
        <Row>
        <Col md={12}>
        <PlayerGrid
          rowData={this.state.rowData}
          teamList={this.state.teamList}
          onPlayerDataChange={this.onPlayerDataChange}>
        </PlayerGrid>
        </Col>
        </Row>
        <Row>
        <Col md={12}>
        <p style={{marginTop:"10px"}}>Created by <a href="https://github.com/jbarciauskas">Joel Barciauskas</a>, full source available on <a href="https://github.com/jbarciauskas/ffauction-app">GitHub</a> and <a href="https://spdx.org/licenses/GPL-3.0.html">licensed under GPL-3.0</a></p>
        </Col>
        </Row>
        </Grid>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("root"));

function calcCurrentDraftStatus(players, startingBudget, teamList, leagueSettings) {
  let accumulatedValue = 0;
  let usedBudget = 0;
  let mySpentBudget = 0;
  let nextBest = {
    "qb": [],
    "rb": [],
    "wr": [],
    "te": [],
  };
  let currentRoster = [];

  let sortedPlayersByValue = players.concat().sort((a, b) => {
    var val1 = b.base_price;
    if(!parseFloat(val1)) {
      val1 = 0;
    }
    var val2 = a.base_price;
    if(!parseFloat(val2)) {
      val2 = 0;
    }
    return val1 - val2;
  });

  let rosterCountsByPosition = {
    'QB':1,
    'WR':1,
    'RB':1,
    'TE':1,
  };

  sortedPlayersByValue.forEach((player) => {
    if(player.purchase_price > 0) {
      accumulatedValue += player.base_price - player.purchase_price;
    }

    if(player.base_price > 0) {
      rosterCountsByPosition[player.position] += 1;
    }
    usedBudget += player.purchase_price;
    // @TODO some other way to set a team as "yours"?
    if(teamList && player.draft_team == teamList[0]) {
      mySpentBudget += player.purchase_price;
      currentRoster.push(player);
    }
    if(player.purchase_price == 0) {
      if(player.position == 'QB' && nextBest.qb.length < 2) {
        nextBest.qb.push(player);
      }
      else if(player.position == 'RB' && nextBest.rb.length < 2) {
        nextBest.rb.push(player);
      }
      else if(player.position == 'WR' && nextBest.wr.length < 2) {
        nextBest.wr.push(player);
      }
      else if(player.position == 'TE' && nextBest.te.length < 2) {
        nextBest.te.push(player);
      }
    }
  });

  if(players.length > 0) {
    leagueSettings.override_bench_allocation = rosterCountsByPosition;
    leagueSettings.override_bench_allocation['QB'] -= (leagueSettings.roster.qb * leagueSettings.num_teams);
    leagueSettings.override_bench_allocation['RB'] -= (leagueSettings.roster.rb * leagueSettings.num_teams);
    leagueSettings.override_bench_allocation['WR'] -= (leagueSettings.roster.wr * leagueSettings.num_teams);
    leagueSettings.override_bench_allocation['TE'] -= (leagueSettings.roster.te * leagueSettings.num_teams);
  }

  currentRoster.sort((a, b) => { return b.points - a.points });
  let rosterByPosition = {
    'QB':[],
    'WR':[],
    'RB':[],
    'TE':[],
    'K':[],
    'DST':[],
    'flex':[],
    'bench':[],
  }

  currentRoster.forEach((player) => {
    if((
          player.position == 'WR' ||
          player.position == 'RB' ||
          player.position == 'TE'
       ) &&
      rosterByPosition[player.position].length == leagueSettings.roster[player.position.toLowerCase()]) {
      if(rosterByPosition['flex'].length == leagueSettings.roster['flex']) {
        rosterByPosition['bench'].push(player);
      }
      else rosterByPosition['flex'].push(player);
    }
    else {
      rosterByPosition[player.position].push(player);
    }
  });


  let inflationRate = (startingBudget + accumulatedValue) / startingBudget
  players.forEach((player) => {
    player.inflated_price = inflationRate * player.base_price;
  });
  return {
    "usedBudget": usedBudget,
    "inflationRate": inflationRate,
    "mySpentBudget": mySpentBudget,
    "nextBest": nextBest,
    "currentRosterLength": currentRoster.length,
    "rosterByPosition": rosterByPosition
  };
}

function mergeSavedData(players) {
  players.forEach((player) => {
    let savedPlayerData = localStorage.getItem("player-" + player.player_id);
    if(savedPlayerData) {
      savedPlayerData = JSON.parse(savedPlayerData);
      player.purchase_price = savedPlayerData.purchase_price;
      player.draft_team = savedPlayerData.draft_team;
      player.keeper = savedPlayerData.keeper;
    }
    else {
      player.purchase_price = 0;
      player.keeper = 'No';
    }
  });
  return players;
}
