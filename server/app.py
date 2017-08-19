from flask import Flask, request, render_template
import json
import os
import pickle
import redis

from auth import requires_auth
from ffauction.league import League
from ffauction.player import PlayerSet, PlayerPriceJsonEncoder
from ffauction.pricing import VBDModel, PriceModel
from ffauction.user_settings import UserSettings


app = Flask(__name__)


DEFAULTS = {
    "num_teams": 12,
    "team_budget": 200,
    "flex_type": "rb/wr/te",
    "starter_budget_pct": 0.88,
    "override_bench_allocation": {},
    "override_bench": False,
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
        "passYds": .04,
        "passTds": 4,
        "twoPts": 2,
        "sacks": 0,  # Yahoo default: 0
        "passInt": -1,  # Yahoo default: -1
        "rushAtt": 0,
        "rushYds": .1,
        "rushTds": 6,
        "rec": 0,  # PPR setting
        "recYds": .1,
        "recTds": 6,
        "fumbles": -2
    }
}


@app.route('/api/players', methods=['POST', 'GET'])
def get_players():
    settings_dict = DEFAULTS.copy()
    if request.json:
        if 'scoring' in request.json:
            if 'passYds' in request.json['scoring']:
                request.json['scoring']['passYds'] =\
                    (1 / request.json['scoring']['passYds'])
            if 'rushYds' in request.json['scoring']:
                request.json['scoring']['rushYds'] =\
                    (1 / request.json['scoring']['rushYds'])
            if 'recYds' in request.json['scoring']:
                request.json['scoring']['recYds'] =\
                    (1 / request.json['scoring']['recYds'])
        settings_dict.update(request.json)
    user_settings = UserSettings(settings_dict)
    r = redis.from_url(os.environ.get("REDIS_URL"))
    pickled_player_set = r.get('projections')
    if not pickled_player_set:
        return "No projections"
    player_set = pickle.loads(pickled_player_set)
    league = League(user_settings, player_set)
    league.calc_projected_points()
    vbd_model = VBDModel()
    vbd_model.calc_vbd(league)
    price_model = PriceModel()
    (starter_pf, bench_pf) = price_model.calc_base_prices(league)
    return json.dumps({
        'starterPF': starter_pf,
        'benchPF': bench_pf,
        'players': player_set.get_all()
        }, cls=PlayerPriceJsonEncoder)


@app.route('/api/uploadProjections', methods=['POST'])
@requires_auth
def upload_projections():
    if 'projections' not in request.files:
        return "Failed, missing file"
    projections = request.files['projections']
    player_set = PlayerSet()
    player_set.load_projection_stats_from_csv(projections)
    r = redis.from_url(os.environ.get("REDIS_URL"))
    r.set('projections', pickle.dumps(player_set))
    return "Success"


@app.route('/')
def index():
    return render_template('index.html')
