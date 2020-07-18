To generate production TLS certificates run:

```
FQDN=<server-ip> make -f Makefile.tls
```

The generated certificates will be uploaded as part of App Engine deploy. You will also need to copy the certificates to redis server.
