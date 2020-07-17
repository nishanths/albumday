## Development

To develop locally you will need node, npm, [entr](http://eradman.com/entrproject/), and redis.

Install dependencies.

```
make deps
```

Start redis server.

```
# TODO
```

Build server and web code. In separate terminals run the following.

```
cd shared
make watch
```

```
cd appengine
make watch
```

```
cd web
make watch
```

Visit `localhost:8080`.
