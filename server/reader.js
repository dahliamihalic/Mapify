//code taken from the maxmind website

// Asynchronous database opening
const Reader = require('@maxmind/geoip2-node').Reader;

Reader.open('/GeoLite2-City_20251205/GeoLite2-City.mmdb').then((reader) => {
  const response = reader.city('128.101.101.101');

  console.log(response.country.isoCode);
});

// Synchronous database opening
const fs = require('fs');
const Reader = require('@maxmind/geoip2-node').Reader;

const dbBuffer = fs.readFileSync('/GeoLite2-City_20251205/GeoLite2-City.mmdb');

// This reader object should be reused across lookups as creation of it is expensive.
const reader = Reader.openBuffer(dbBuffer);

response = reader.city('128.101.101.101');

console.log(response.country.isoCode);