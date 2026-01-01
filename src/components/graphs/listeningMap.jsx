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

        svg.selectAll("*").remove(); // clean the map

        const g = svg.append("g");
        gRef.current = g;

        const projection = d3.geoNaturalEarth1();
        projectionRef.current = projection;

        const path = d3.geoPath().projection(projection);
        pathRef.current = path;

        const zoom = d3.zoom()
            .scaleExtent([1, 10])
            .on("zoom", (event) => g.attr("transform", event.transform));

        zoomBehaviorRef.current = zoom;
        svg.call(zoom);

        // Load world map
        d3.json("data/world-110m.json")
            .catch(() => d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"))
            .then(world => {
                const countries = topojson.feature(world, world.objects.countries).features;

                projection.fitSize([width, height], { type: "FeatureCollection", features: countries });

                g.selectAll("path")
                    .data(countries)
                    .join("path")
                    .attr("d", path)
                    .attr("fill", mode === "light" ? "#e0e0e0" : "#333")
                    .attr("stroke", mode === "light" ? "#555" : "#222")
                    .attr("stroke-width", 0.5);

                zoomToUS();
                setMapReady(true);
            });

    }, [mode]);

    useEffect(() => {
        if (!mapReady) return;
        if (!gRef.current || !projectionRef.current || !Array.isArray(data)) return;

        const g = gRef.current;
        const projection = projectionRef.current;

        g.selectAll(".ip-point").remove();

        // Filter valid geo data
        const valid = data.filter(d =>
            d.geo?.lat && d.geo?.lon &&
            !isNaN(d.geo.lat) && !isNaN(d.geo.lon)
        );

        // Group by lat/lon
        const locationMap = new Map();
        valid.forEach(d => {
            const key = `${d.geo.lat.toFixed(3)},${d.geo.lon.toFixed(3)}`;
            if (!locationMap.has(key)) locationMap.set(key, []);
            locationMap.get(key).push(d);
        });

        // Get most played track per location
        const points = [];
        locationMap.forEach((arr) => {
            const mostPlayed = arr.reduce((a, b) => (a.ms_played > b.ms_played ? a : b));
            points.push({
                latitude: mostPlayed.geo.lat,
                longitude: mostPlayed.geo.lon,
                track_name: mostPlayed.master_metadata_track_name,
                artist_name: mostPlayed.master_metadata_album_artist_name,
                album_name: mostPlayed.master_metadata_album_album_name,
                ms_played: mostPlayed.ms_played,
                city: mostPlayed.geo.city,
                country: mostPlayed.geo.country
            });
        });

        // Count plays per city
        const cityCounts = new Map();
        valid.forEach(d => {
            const city = d.geo.city || "Unknown city";
            cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
        });

        setTopCities(
            [...cityCounts.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
        );

        // Draw points
        g.selectAll(".ip-point")
            .data(points)
            .enter()
            .append("circle")
            .attr("class", "ip-point")
            .attr("cx", d => projection([d.longitude, d.latitude])?.[0])
            .attr("cy", d => projection([d.longitude, d.latitude])?.[1])
            .attr("r", 2)
            .attr("fill", mode === "light" ? "#ba324f" : "#9abec6")
            .attr("opacity", mode === "light" ? 0.75 : 0.5)
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

        d3.select(svgRef.current).on("mouseleave", () => d3.select("#ip-tooltip").style("opacity", 0));

    }, [data, mapReady, mode]);

    const zoomToUS = () => {
        const svg = d3.select(svgRef.current);
        const zoom = zoomBehaviorRef.current;
        const projection = projectionRef.current;

        const bbox = { west: -125, east: -66, north: 49, south: 24 };
        const pNW = projection([bbox.west, bbox.north]);
        const pSE = projection([bbox.east, bbox.south]);
        if (!pNW || !pSE) return;

        const [[x0, y0], [x1, y1]] = [pNW, pSE];
        const scale = Math.min(width / Math.abs(x1 - x0), height / Math.abs(y1 - y0)) * 0.9;
        const translateX = (width - scale * (x0 + x1)) / 2;
        const translateY = (height - scale * (y0 + y1)) / 2;

        svg.transition()
            .duration(900)
            .call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
    };

    return (
        <Row>
            <div className="ip-map-container" style={{ position: "relative" }}>
                <h2 style={{ textAlign: "center", marginBottom: 20 }}>Where Have You Been Loca?</h2>
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
                        <li key={city}>{city} — {count} plays</li>
                    ))}
                </ol>
                <p>*Note that these locations are found via IP address,<br />
                and may not be entirely accurate.</p>
            </div>
        </Row>
    );
};

export default ListeningMap;
