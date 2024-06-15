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

## Supabase integration for saving the state

Using Edge Functions, but could also use DB Rest API directly instead.

Function `insert-poker-state`, file `index.ts`:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
);

async function fetchLastEntry() {
    const lastEntry = await supabase
        .from("poker_state")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);
    return lastEntry.data?.[0].state;
}

Deno.serve(async (request: Request) => {
    const data = await request.json();
    const lastData = await fetchLastEntry();
    if (JSON.stringify(data) !== JSON.stringify(lastData)) {
        await supabase
            .from("poker_state")
            .insert([{ state: data }]);
    }
    return new Response();
});
```

Function `get-latest-poker-state`, file `index.ts`:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
);

Deno.serve(async () => {
    const lastEntry = await supabase
        .from("poker_state")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

    const data = { "lastEntry": lastEntry.data?.[0] };

    return new Response(
        JSON.stringify(data),
        { headers: { "Content-Type": "application/json" } },
    );
});
```

Table `poker_state` definition:

| Name       | Data Type                | Format      |
| ---------- | ------------------------ | ----------- |
| id         | bigint                   | int8        |
| created_at | timestamp with time zone | timestamptz |
| state      | json                     | json        |
