## Develop

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
cd appengine-go
make
```

```
cd web
make
```

Visit `localhost:8080`.

## Deploy

```
make all
make deploy
```
