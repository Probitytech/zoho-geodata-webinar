((w, d) => {

    class App {
        constructor() {
            const href = ""+window.location.href;
            console.log(href);
            this.owner = "malthinae.com";
            this.application = "test";
            this.visitReportName = "All_Visits";
            this.visitFormName = "Visit";
            this.apartmentReportName = "All_Apartments";

            this.center = undefined;
            this.map = undefined;
            this.points = [];
        }

        async init(query, mapRef) {
            try {
                console.log(query);

                this.center = await this.getCenter(query.record_id);
                console.log(this.center);

                this.points = await this.getPoints(this.center.latitude, this.center.longitude, parseInt(query.distance) * 1000)
                console.log(this.points);             

                const map = new google.maps.Map(mapRef, {
                    zoom: 7,
                    center: { lat: this.center.latitude, lng: this.center.longitude },
                });

                const bounds = new google.maps.LatLngBounds();


                this.points.forEach(p => {
                    let LatLng = new google.maps.LatLng(p.latitude, p.longitude);
                    let marker = new google.maps.Marker({
                        position: LatLng,
                        map: map,
                    });

                    const link = `https://creatorapp.zoho.com/${this.owner}/${this.application}/#Form:${this.visitFormName}?Apartment=${p.ID}&zc_LoadIn=dialog`;

                    const infowindow = new google.maps.InfoWindow({
                        content: `<div style="max-width:160px;">
                                    <div style="font-size:1em; font-weight:bold; text-align:center; padding:2px;">${p.Title}</div>
                                    <img src="${p.Image}" 
                                        style="max-width:120px;max-height:120px;display: block; margin: 0 auto;">
                                    </img>
                                    <a style="margin:6px auto; box-shadow:inset 0px 1px 0px 0px #ffffff; 
                                        background:linear-gradient(to bottom, #f9f9f9 5%, #e9e9e9 100%); background-color:#f9f9f9; 
                                        border-radius:6px; border:1px solid #dcdcdc; display:block; cursor:pointer; color:#444; 
                                        font-family:Arial; font-size:14px; font-weight:bold; padding:6px 24px; text-decoration:none; 
                                        text-shadow:0px 1px 0px #ffffff;" href="${link}" target="_top">Schedule Visit</a>
                                  </div>`,
                    });

                    marker.addListener("click", () => {
                        infowindow.open(map, marker);
                    });
                    bounds.extend(LatLng);
                });

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


                map.fitBounds(bounds);

            } catch (error) {
                console.log(error);
            }

        }

        async getPoints(lat, long, distance) {
            let sq = this.square_bounds(lat, long, distance);
            console.log("Square bounds:", sq);
            let points = await ZOHO.CREATOR.API.getAllRecords({
                reportName: this.apartmentReportName,
                criteria: `(latitude1 >= ${sq.latmin} && latitude1 <= ${sq.latmax} && longitude1 >= ${sq.longmin} && longitude1 <= ${sq.longmax})`,
                page: 1,
                pageSize: 200
            })

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

        async getCenter(record_id) {

            let record = await ZOHO.CREATOR.API.getRecordById({
                reportName: this.visitReportName,
                id: record_id
            })
            let center = await ZOHO.CREATOR.API.getRecordById({
                reportName: this.apartmentReportName,
                id: record.data.Apartment.ID
            })
            
            return {
                ID: center.data.ID,
                Image: center.data.Image,
                Title: center.data.Title,
                latitude: parseFloat(center.data.latitude1),
                longitude: parseFloat(center.data.longitude1),
            };
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
            const R = 6372795.0 / 1.609;
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