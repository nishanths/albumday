To generate production TLS certificates run:

```
FQDN=<redis-server-ip> make tls
```

Certificates will be generated in `${OUTDIR}` (see default value in Makefile).

The certificates should be uploaded as part of App Engine deploy. You will also need to copy the certificates to redis server.
