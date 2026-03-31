import os
from pathlib import Path

base_path = r"d:\Sem6\G&T\badminton_tournament"

directories = [
    "src/app/api/tournaments/[id]/standings",
    "src/app/api/tournaments/[id]/generate-fixtures",
    "src/app/api/matches/[id]/score",
    "src/app/api/matches/[id]/timer",
    "src/app/api/sync",
    "src/app/admin",
    "src/app/admin/tournaments/new",
    "src/app/admin/tournaments/[id]",
    "src/app/admin/tournaments/[id]/matches/[matchId]",
    "src/app/viewer",
    "src/app/viewer/tournaments/[id]",
    "src/app/viewer/tournaments/[id]/leaderboard",
    "src/app/viewer/tournaments/[id]/players",
    "src/app/viewer/tournaments/[id]/teams/[teamId]",
    "src/components/ui",
    "src/components/tournament",
    "src/components/match",
    "src/components/shared",
    "src/lib/db",
    "src/lib/offline",
    "src/lib/scoring",
    "src/lib/standings",
    "src/lib/utils",
    "src/stores",
    "src/hooks",
    "public",
    "scripts"
]

for dir_path in directories:
    full_path = os.path.join(base_path, dir_path)
    Path(full_path).mkdir(parents=True, exist_ok=True)
    print(f"Created: {dir_path}")

print("\nDirectory structure created successfully!")
print("\nNow run: npm install")
print("Then run: npm run dev")
