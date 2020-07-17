#!/bin/bash

OUTDIR=$1

[ -z "${OUTDIR}" ] && echo "usage: $0 <outdir>"; exit 2

openssl genrsa -out ${OUTDIR}/ca.key 4096
openssl req \
    -x509 -new -nodes -sha256 \
    -key ${OUTDIR}/ca.key \
    -days 3650 \
    -subj '/O=Redis Test/CN=Certificate Authority' \
    -out ${OUTDIR}/ca.crt
openssl genrsa -out ${OUTDIR}/redis.key 2048
openssl req \
    -new -sha256 \
    -key ${OUTDIR}/redis.key \
    -subj '/O=Redis Test/CN=Server' | \
    openssl x509 \
        -req -sha256 \
        -CA ${OUTDIR}/ca.crt \
        -CAkey ${OUTDIR}/ca.key \
        -CAserial ${OUTDIR}/ca.txt \
        -CAcreateserial \
        -days 365 \
        -out ${OUTDIR}/redis.crt
openssl dhparam -out ${OUTDIR}/redis.dh 2048
