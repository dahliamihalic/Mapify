import React, { useEffect, useRef, useContext, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { DataContext } from "../../contexts/DataContext";
import { ModeContext } from "../../contexts/ModeContext";
import Row from "../Row";

const ListeningMap = () => {
    const { data } = useContext(DataContext);
    const { mode } = useContext(ModeContext);

    const svgRef = useRef(null);
    const gRef = useRef(null);
    const projectionRef = useRef(null);
    const pathRef = useRef(null);
    const zoomBehaviorRef = useRef(null);

    const width = 900;
    const height = 600;
    const [mapReady, setMapReady] = useState(false);
    const [topCities, setTopCities] = useState([]);

    useEffect(() => {
        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height);

        // clean the map
        svg.selectAll("*").remove();

        const g = svg.append("g");
        gRef.current = g;

        //physical map
        const projection = d3.geoNaturalEarth1();
        projectionRef.current = projection;

        const path = d3.geoPath().projection(projection);
        pathRef.current = path;

        // zoom functionality
        const zoom = d3.zoom()
            .scaleExtent([1, 10])
            .on("zoom", (event) => g.attr("transform", event.transform));

        zoomBehaviorRef.current = zoom;
        svg.call(zoom);

        // json map data
        d3.json("data/world-110m.json")
            .catch(() => d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"))
            .then(world => {
                const countries = topojson.feature(world, world.objects.countries).features;

                // setting size for world
                projection.fitSize([width, height], {
                    type: "FeatureCollection",
                    features: countries
                });

                // draw countries
                g.selectAll("path")
                    .data(countries)
                    .join("path")
                    .attr("d", path)
                    .attr("fill", mode == "light" ? "#e0e0e0" : "#333")
                    .attr("stroke", mode == "light" ? "#555" : "#222")
                    .attr("stroke-width", 0.5);

                // default zoom to US because that's where our users are prob from, could do something cool with ip in the future to zoom to where their current IP address is
                zoomToUS();
                setMapReady(true);

            });

    }, []);

    // ip plotting
    useEffect(() => {
        if (!mapReady) return;

        if (!gRef.current || !projectionRef.current || !Array.isArray(data)) return; //checking that refs and data are ready

        const g = gRef.current;
        const projection = projectionRef.current;

        g.selectAll(".ip-point").remove();

        // filter valid data with lat/lon
        const valid = data.filter(d =>
            d.latitude && d.longitude &&
            !isNaN(d.latitude) && !isNaN(d.longitude)
        );

        // aggregate by lat/lon to find most popular track
        const locationMap = new Map();

        valid.forEach(d => {
            const key = `${d.latitude.toFixed(3)},${d.longitude.toFixed(3)}`; // group nearby points
            if (!locationMap.has(key)) {
                locationMap.set(key, []);
            }
            locationMap.get(key).push(d);
        });

        // For each location, find the track with max ms_played
        const points = [];
        locationMap.forEach((arr, key) => {
            const mostPlayed = arr.reduce((a, b) => (a.ms_played > b.ms_played ? a : b));
            points.push({
                latitude: mostPlayed.latitude,
                longitude: mostPlayed.longitude,
                track_name: mostPlayed.master_metadata_track_name,
                artist_name: mostPlayed.master_metadata_album_artist_name,
                album_name: mostPlayed.master_metadata_album_album_name,
                ms_played: mostPlayed.ms_played,
                city: mostPlayed.city,
                country: mostPlayed.country
            });
        });

        const cityCounts = new Map();

        valid.forEach(d => {
            const city = d.city || "Unknown city";
            cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
        });

        // top 3
        setTopCities(
            [...cityCounts.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
        );


        g.selectAll(".ip-point")
            .data(points)
            .enter()
            .append("circle")
            .attr("class", "ip-point")
            .attr("cx", d => projection([d.longitude, d.latitude])?.[0])
            .attr("cy", d => projection([d.longitude, d.latitude])?.[1])
            .attr("r", 2)
            .attr("fill", mode == "light" ? "#ba324f" : "#9abec6")
            .attr("opacity", mode == "light" ? 0.75 : 0.5)
            .on("mouseover", (event, d) => {
                d3.select("#ip-tooltip")
                    .style("opacity", 1)
                    .html(`
                    <strong>Track:</strong> ${d.track_name}<br>
                    <strong>Artist:</strong> ${d.artist_name}<br>
                    <strong>Album:</strong> ${d.album_name}<br>
                    <strong>City:</strong> ${d.city ?? "Unknown"}<br>
                    <strong>Country:</strong> ${d.country ?? "Unknown"}<br>
                    <strong>Playtime:</strong> ${(d.ms_played / 1000).toFixed(1)}s
                `);
            })
            .on("mousemove", event => {
                d3.select("#ip-tooltip")
                    .style("left", (event.clientX + 10) + "px")
                    .style("top", (event.clientY + 10) + "px");
            })
            .on("mouseout", () => d3.select("#ip-tooltip").style("opacity", 0));

    }, [data, mapReady]);


    //us zoom functionality
    const zoomToUS = () => {
        const svg = d3.select(svgRef.current);
        const zoom = zoomBehaviorRef.current;
        const projection = projectionRef.current;

        // US Bounds, had to google
        const bbox = {
            west: -125,
            east: -66,
            north: 49,
            south: 24
        };

        const pNW = projection([bbox.west, bbox.north]);
        const pSE = projection([bbox.east, bbox.south]);

        if (!pNW || !pSE) return;

        const [[x0, y0], [x1, y1]] = [pNW, pSE];

        const scale = Math.min(
            width / Math.abs(x1 - x0),
            height / Math.abs(y1 - y0)
        ) * 0.9;

        const translateX = (width - scale * (x0 + x1)) / 2;
        const translateY = (height - scale * (y0 + y1)) / 2;

        svg.transition()
            .duration(900)
            .call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
    };

    return (
        <Row>
            <div className="ip-map-container" style={{ position: "relative" }}>
                <h2 style={{ textAlign: "center", marginBottom: 20 }}>
                    Where Have You Been Loca?
                </h2>

                <svg ref={svgRef}></svg>

                <div
                    id="ip-tooltip"
                    style={{
                        position: "fixed",
                        opacity: 0,
                        background: "white",
                        padding: "8px",
                        borderRadius: "6px",
                        border: "1px solid black",
                        pointerEvents: "none",
                        zIndex: 1000,
                        color: "black"
                    }}
                ></div>
            </div>
            <div className="text-col-r">
                <h3>You did most of your listening</h3>
                <ol>
                    {topCities.map(([city, count]) => (
                        <li key={city}>
                            {city} — {count} plays
                        </li>
                    ))}
                </ol>
            </div>
        </Row>
    );
};

export default ListeningMap;
