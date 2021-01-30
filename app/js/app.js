((w, d) => {

    class App {
        constructor() {

            // extract application owner and deluge name from location url
            const href = (window.location != window.parent.location) ? 
                document.referrer : document.location.href;
            const parts = href.split('//').pop().split('/');
            this.owner = parts[1];
            this.application = parts[2];
            
            //
            // center of map
            this.center = undefined;

            // reference to map object
            this.map = undefined;

            // points on map
            this.points = [];
        }

        async init(query, mapRef) {
            try {
                // get page query
                // expected record_id and distance in miles
                console.log(query);

                // get Visit record
                this.center = await this.getCenter(query.record_id);
                console.log(this.center);

                // get points within the distance
                this.points = await this.getPoints(this.center.latitude, this.center.longitude, 
                    parseInt(query.distance) * 1000)
                console.log(this.points);             

                // Init map with mapRef -> div#map
                const map = new google.maps.Map(mapRef, {
                    zoom: 7,
                    center: { lat: this.center.latitude, lng: this.center.longitude },
                });

                
                const bounds = new google.maps.LatLngBounds();
                // put the markers on map 
                this.points.forEach(p => {
                    let LatLng = new google.maps.LatLng(p.latitude, p.longitude);
                    let marker = new google.maps.Marker({
                        position: LatLng,
                        map: map,
                    });

                    //url to open in parent window - open Visit form in popup
                    const link = `https://creatorapp.zoho.com/${this.owner}/${this.application}/#Form:Visit?Apartment=${p.ID}&zc_LoadIn=dialog`;

                    //create popup window 
                    const infowindow = new google.maps.InfoWindow({
                        content: `<div class="marker-content">
                                    <div class="title">${p.Title}</div>
                                    <img src="${p.Image}"></img>
                                    <a class="visit-link" href="${link}" target="_top">Schedule Visit</a>
                                  </div>`,
                    });
                    //bind popup window with marker click
                    marker.addListener("click", () => {
                        infowindow.open(map, marker);
                    });

                    // recalculate bounds (make sure all markers on map)
                    bounds.extend(LatLng);
                });

                // Put red circle on map
                const circle = new google.maps.Circle({
                    strokeColor: "#FF0000",
                    strokeOpacity: 0.4,
                    strokeWeight: 1,
                    fillColor: "#FA5858",
                    fillOpacity: 0.3,
                    map,
                    center: { lat: this.center.latitude, lng: this.center.longitude },
                    radius: parseInt(query.distance) * 1000 * 1.609,
                  });

                // resize map
                map.fitBounds(bounds);

            } catch (error) {
                console.log(error);
            }

        }

        async getCenter(record_id) {

            // get Visit (record_id)
            let record = await ZOHO.CREATOR.API.getRecordById({
                reportName: "All_Visits",
                id: record_id
            })

            // get Apartment related to Visit
            let center = await ZOHO.CREATOR.API.getRecordById({
                reportName: "All_Apartments",
                id: record.data.Apartment.ID
            })
            
            // clear unnecessary data
            return {
                ID: center.data.ID,
                Image: center.data.Image,
                Title: center.data.Title,
                latitude: parseFloat(center.data.latitude1),
                longitude: parseFloat(center.data.longitude1),
            };
        }

        async getPoints(lat, long, distance) {
            // get square bounds 
            let sq = this.square_bounds(lat, long, distance);
            console.log("Square bounds:", sq);

            //fetch points using criteria
            let points = await ZOHO.CREATOR.API.getAllRecords({
                reportName: "All_Apartments",
                criteria: `(latitude1 >= ${sq.latmin} && latitude1 <= ${sq.latmax} && longitude1 >= ${sq.longmin} && longitude1 <= ${sq.longmax})`,
                page: 1,
                pageSize: 200
            })

            // cast latitude/longitude as float 
            // then filter against haversine distance
            return points.data.map(p => {
                return {
                    ID: p.ID,
                    Image: p.Image,
                    Title: p.Title,
                    latitude: parseFloat(p.latitude1),
                    longitude: parseFloat(p.longitude1)
                }
            }).filter(p => {
                return (this.distance(lat, long, p.latitude, p.longitude) <= distance)
            });

        }

        distance = (src_Lat, src_Long, dst_Lat, dst_Long) => {
            const PI = 3.14159265358979;
            const lat1 = src_Lat * PI / 180.0;
            const lat2 = dst_Lat * PI / 180.0;
            const long1 = src_Long * PI / 180.0;
            const long2 = dst_Long * PI / 180.0;
            const y = Math.sqrt(Math.pow(Math.cos(lat2) * Math.sin(long2 - long1), 2) + Math.pow(Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(long2 - long1), 2));
            const x = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(long2 - long1);
            return Math.atan2(y, x) * 6371000.0 / 1.609;
        }

        square_bounds = (clat, clng, radius) => {
            const PI = 3.14159265358979;
            const R = 6371000.0 / 1.609;
            const Lat = clat * PI / 180.0;
            const Lng = clng * PI / 180.0;
            const d = radius / parseInt(R);
            const latmin = Math.asin(Math.sin(Lat) * Math.cos(d) + Math.cos(Lat) * Math.sin(d) * Math.cos(0)) * 180 / PI;
            const latmax = Math.asin(Math.sin(Lat) * Math.cos(d) + Math.cos(Lat) * Math.sin(d) * Math.cos(PI)) * 180 / PI;
            const lngmin = ((Lng + Math.atan2(Math.sin(PI / 2) * Math.sin(d) * Math.cos(Lat), Math.cos(d) - Math.sin(Lat) * Math.sin(Lat))) * 180) / PI;
            const lngmax = ((Lng + Math.atan2(Math.sin(3 * PI / 2) * Math.sin(d) * Math.cos(Lat), Math.cos(d) - Math.sin(Lat) * Math.sin(Lat))) * 180) / PI;
            return {
                "latmin": Math.min(latmin, latmax),
                "latmax": Math.max(latmin, latmax),
                "longmin": Math.min(lngmin, lngmax),
                "longmax": Math.max(lngmin, lngmax)
            }

        }

    }

    var app = w.App = new App();

})(window, document)