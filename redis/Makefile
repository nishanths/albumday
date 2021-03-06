# adapted from
# https://stackoverflow.com/questions/33558076/cannot-use-ip-in-node-js-for-self-signed-certificate

FQDN ?= 127.0.0.1
OUTDIR ?= tls

.PHONY: default
default:
	@echo "default target does nothing"

.PHONY: tls
tls: prepare REDIS.crt REDIS.dh clean

.PHONY: prepare
prepare:
	mkdir -p ${OUTDIR}

.PHONY: clean
clean:
	rm -f openssl.conf
	rm -f .srl

openssl.conf:
	cat /etc/ssl/openssl.cnf > openssl.conf
	echo "" >> openssl.conf
	echo "[ san_env ]" >> openssl.conf
	echo "subjectAltName = IP:${FQDN}" >> openssl.conf

CA.key:
	openssl genrsa 4096 > ${OUTDIR}/ca.key

CA.crt: CA.key
	openssl req \
		-new \
		-x509 \
		-nodes \
		-sha256 \
		-key ${OUTDIR}/ca.key \
		-days 3650 \
		-subj "/C=AU/CN=example" \
		-out ${OUTDIR}/ca.crt

REDIS.csr: openssl.conf
	# is -extensions necessary?
	# https://security.stackexchange.com/a/86999
	SAN=IP:$(FQDN) openssl req \
		-reqexts san_env \
		-extensions san_env \
		-config openssl.conf \
		-newkey rsa:4096 \
		-nodes -sha256 \
		-keyout ${OUTDIR}/redis.key \
		-subj "/C=AU/CN=$(FQDN)" \
		-out ${OUTDIR}/redis.csr

REDIS.crt: openssl.conf CA.key CA.crt REDIS.csr
	SAN=IP:$(FQDN) openssl x509 \
		-req -sha256 \
		-extfile openssl.conf \
		-extensions san_env \
		-days 365 \
		-in ${OUTDIR}/redis.csr \
		-CA ${OUTDIR}/ca.crt \
		-CAkey ${OUTDIR}/ca.key \
		-CAcreateserial \
		-out ${OUTDIR}/redis.crt

REDIS.dh:
	openssl dhparam -out ${OUTDIR}/redis.dh 2048
