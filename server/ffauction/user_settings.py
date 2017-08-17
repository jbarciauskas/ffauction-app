class UserSettings:
    def __init__(self, settings_dict):
        self.scoring = settings_dict['scoring']
        self.num_teams = settings_dict['num_teams']
        self.team_budget = settings_dict['team_budget']
        self.qb = settings_dict['roster']['qb']
        self.rb = settings_dict['roster']['rb']
        self.wr = settings_dict['roster']['wr']
        self.te = settings_dict['roster']['te']
        self.flex = settings_dict['roster']['flex']
        self.k = settings_dict['roster']['k']
        self.team_def = settings_dict['roster']['team_def']
        self.bench = settings_dict['roster']['bench']
        self.flex_type = settings_dict['flex_type']
        self.starter_budget_pct = settings_dict['starter_budget_pct']
        if len(settings_dict['override_bench_allocation'].keys()) > 0:
            self.bench_allocation = settings_dict['override_bench_allocation']
        else:
            self.bench_allocation = None

    def get_roster_size(self):
        return (self.get_num_starters() + self.bench)

    def get_num_starters(self):
        return (self.qb + self.rb + self.wr + self.te + self.flex + self.k
                + self.team_def)

    def get_available_budget(self):
        return (self.team_budget * self.num_teams
                - ((self.k + self.team_def) * self.num_teams))
