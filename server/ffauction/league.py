from math import floor


class League:
    def __init__(self, user_settings, player_set):
        self.user_settings = user_settings
        self.player_set = player_set

    def calc_projected_points(self):
        list_of_players = self.player_set.get_all()
        for player in list_of_players:
            player.calc_points(self.user_settings.scoring)

    def get_starting_spots(self):
        starter_counts = {}
        starter_counts['QB'] = (self.user_settings.qb
                                * self.user_settings.num_teams)
        starter_counts['RB'] = (self.user_settings.rb
                                * self.user_settings.num_teams)
        starter_counts['WR'] = (self.user_settings.wr
                                * self.user_settings.num_teams)
        starter_counts['TE'] = (self.user_settings.te
                                * self.user_settings.num_teams)

        flex_list = self.player_set.get_flex(self.user_settings.flex_type,
                                             starter_counts['QB'],
                                             starter_counts['RB'],
                                             starter_counts['WR'],
                                             starter_counts['TE'],
                                             (self.user_settings.flex
                                              * self.user_settings.num_teams))

        for player in flex_list:
            starter_counts[player.position] += 1
        starter_counts['K'] = (self.user_settings.num_teams
                               * self.user_settings.k)
        starter_counts['DEF'] = (self.user_settings.num_teams
                                 * self.user_settings.team_def)
        return starter_counts

    def get_roster_spots(self, starter_counts):
        roster_spots = {}
        total_bench_size = (self.user_settings.bench
                            * self.user_settings.num_teams)
        total_starters = 0
        for position in ["QB", "RB", "WR", "TE"]:
            total_starters += starter_counts[position]

        if self.user_settings.bench_allocation is None:
            for position in ["QB", "RB", "WR", "TE"]:
                roster_spots[position] = int(
                    floor(starter_counts[position]
                          + (float(starter_counts[position]) / float(total_starters)
                             * total_bench_size)))
        else:
            for position in self.user_settings.bench_allocation:
                roster_spots[position] += self.user_settings.bench_allocation[position]
        return roster_spots

    def get_bench(self):
        starter_counts = self.get_starting_spots()
        roster_counts = self.get_roster_spots(starter_counts)
        bench_players = {}
        for position in ["QB", "RB", "WR", "TE"]:
            bench_players[position] = getattr(self.player_set, position)[starter_counts[
                position]:roster_counts[position]]
        return bench_players
