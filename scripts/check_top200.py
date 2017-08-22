import csv
import sys

top200_path = sys.argv[1]
projections_path = sys.argv[2]

top200_players = set()
projected_players = set()

with open(top200_path) as top200_csv:
    reader = csv.reader(top200_csv)
    for row in reader:
        top200_players.add((row[0], row[1], row[2]))

with open(projections_path) as projections_csv:
    reader = csv.reader(projections_csv)
    for row in reader:
        projected_players.add((row[0], row[1], row[3]))

print top200_players.difference(projected_players)
