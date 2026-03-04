const listener = Deno.listenTls({
    port: 4443,
    hostname: "toto.sor.localhost",
    cert: await Deno.readTextFile("_wildcard.sor.localhost.pem"),
    key: await Deno.readTextFile("_wildcard.sor.localhost-key.pem"),
});

console.log(`https://toto.sor.localhost:4443`);

for await (const conn of listener) {
    const httpConn = Deno.serveHttp(conn);
    for await (const requestEvent of httpConn) {
        requestEvent.respondWith(new Response("Hello world"));
    }
}