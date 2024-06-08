# Poker

Scrum Poker web app implemented in Deno.

See the [Wikipedia article](https://en.wikipedia.org/wiki/Planning_poker) on
what Scrum Poker is.

## Usage

The app is available online at `scrumpoker.uno`.

The base URL is [https://scrumpoker.uno/](https://scrumpoker.uno/).

You can append a room number to it, e.g., https://scrumpoker.uno/7 for room
number 7.

**Instructions:**

1. Send the room link to your team members.
2. Enter your name in the name field and click the "Save" button.
3. Each team member can now vote.
4. After all votes are submitted, click the "Show" button to display the
   results.
5. Click "Delete Estimates" to start a new voting session.

## Self-Hosting

The app can be run with Deno. No third-party modules are needed.

See `run.sh` for an example of running in Docker.
