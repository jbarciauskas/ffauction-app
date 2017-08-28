import numpy

class VBDModel:
    def calc_vbd(self, league):
        starter_counts = league.get_starting_spots()
        roster_counts = league.get_roster_spots(starter_counts)
        players_by_position = league.player_set.get_position_players_by_position()
        self.set_vbd(players_by_position, starter_counts, 'starter_vbd')
        self.set_vbd(players_by_position, roster_counts, 'bench_vbd', True)
        for position in players_by_position:
            for player in players_by_position[position]:
                player.avg_vbd = (player.starter_vbd + player.bench_vbd / 2)
        self.assign_tiers(players_by_position)

    def set_vbd(self,
                players_by_position,
                position_counts,
                target_field,
                assign_negative_vbd=False):
        for position in players_by_position:
            players_by_position[position].sort(key=lambda player: player.projected_points, reverse=True)
            pos_base_vbd = (players_by_position
                            [position]
                            [position_counts[position]-1]
                            .projected_points)
            for player in players_by_position[position]:
                new_vbd = player.projected_points - pos_base_vbd
                if not assign_negative_vbd and new_vbd < 0:
                    new_vbd = 0

                setattr(player, target_field, new_vbd)

    def assign_tiers(self, players_by_position):
        for position in players_by_position:
            avg_vbds = [player.avg_vbd for player in players_by_position[position] if player.avg_vbd >= 0]
            std_dev = numpy.std(avg_vbds)
            max_vbd = players_by_position[position][0].avg_vbd
            last_player_points = players_by_position[position][0].projected_points
            count = 1
            for player in players_by_position[position]:
                player.tier = player.position + str(int(round(((max_vbd - player.avg_vbd) / (std_dev / 2)) + 1)))
                if not last_player_points == 0:
                    player.percent_drop = (player.projected_points - last_player_points) / last_player_points
                else:
                    player.percent_drop = 0
                player.rank = player.position + str(count)

                last_player_points = player.projected_points
                count += 1


class PriceModel:
    def calc_base_prices(self, league):
        bench_pf = self.get_bench_pf(league)
        starter_pf = self.get_starter_pf(league, bench_pf)

        for player in league.player_set.get_all():
            player.base_price = (player.starter_vbd * starter_pf +
                                    (player.bench_vbd - player.starter_vbd)
                                    * bench_pf)

        return (starter_pf, bench_pf)

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
