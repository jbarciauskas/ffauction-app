class VBDModel:
    def calc_vbd(self, league):
        starter_counts = league.get_starting_spots()
        roster_counts = league.get_roster_spots(starter_counts)
        starters = league.player_set.get_top_n(starter_counts)
        self.set_vbd(starters, 'starter_vbd')
        self.set_vbd(league.player_set.get_top_n(roster_counts), 'bench_vbd')

    def set_vbd(self, list_of_players, target_field):
        for position in list_of_players:
            pos_base_vbd = list_of_players[position][-1].projected_points
            for player in list_of_players[position]:
                setattr(player, target_field,
                        player.projected_points - pos_base_vbd)


class PriceModel:
    def calc_base_prices(self, league):
        bench_pf = self.get_bench_pf(league)
        starter_pf = self.get_starter_pf(league, bench_pf)

        for player in league.player_set.get_all():
            player.base_price = (player.starter_vbd * starter_pf +
                                 (player.bench_vbd - player.starter_vbd)
                                 * bench_pf)

    def get_bench_pf(self, league):
        bench_budget = (league.user_settings.get_available_budget()
                        * (1 - league.user_settings.starter_budget_pct))
        bench_players = league.get_bench()
        bench_vbd = 0
        for position in bench_players:
            for player in bench_players[position]:
                bench_vbd += player.bench_vbd
        return bench_budget / bench_vbd

    def get_starter_pf(self, league, bench_pf):
        starter_counts = league.get_starting_spots()

        starters = league.player_set.get_top_n(starter_counts)

        start_value_over_bench = 0
        starter_vbd = 0
        for position in starters:
            player = starters[position][0]
            start_value_over_bench += ((player.bench_vbd - player.starter_vbd)
                                       * starter_counts[position])
            for player in starters[position]:
                starter_vbd += player.starter_vbd

        starter_budget = ((league.user_settings.get_available_budget()
                          * league.user_settings.starter_budget_pct)
                          - start_value_over_bench * bench_pf)
        return starter_budget / starter_vbd
