const __dirname = new URL(".", import.meta.url).pathname;

interface Config {
    apiStateFetchUrl?: string;
    apiStateSaveUrl?: string;
    apiStateToken?: string;
    proxyHeaderKey?: string;
    proxyHeaderValue?: string;
    enableHeadersLogging?: boolean;
}

export const config = await (async () => {
    try {
        const parsed: Config = JSON.parse(
            await Deno.readTextFile(__dirname + "config/" + "config.json"),
        );
        return parsed;
    } catch {
        console.log("Config not found or unable to parse it.");
        return;
    }
})();
