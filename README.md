## Development

To develop locally you will need node, npm, [entr](http://eradman.com/entrproject/), and redis.

Install dependencies.

```
make deps
```

Start a redis server at `localhost:6379`.

```
./path/to/redis-server
```

Build & watch code. In separate terminals run the following.

```
cd shared
make
```

```
cd appengine
make
```

```
cd web
make
```

Visit `localhost:8080`.
