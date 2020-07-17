# albumday

## Development

To develop locally you will need node, npm, and redis.

Install dependencies:

```
make deps
```

Start redis server:

```
# TODO
```

Build server and web code. In separate terminals run:

```
cd shared
make watch
```

```
cd server
make watch
```

```
cd web
make watch
```

Visit `localhost:8080`.
