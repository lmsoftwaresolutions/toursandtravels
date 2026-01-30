# toursandtravels
Webportal for Nathkrupa travels
.

Cert Creation Steps:

docker run --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d nathkrupa.lmsoftwaresolutions.com
