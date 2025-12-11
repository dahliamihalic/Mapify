import { createColorScale } from "../../../utils/d3process.js";
import { useRef, useEffect } from "react";
import * as d3 from "d3";
import { useContext } from 'react';
import { DataContext } from '../../../contexts/DataContext.jsx';
import { ModeContext } from "../../../contexts/ModeContext.jsx";

const BiggestYear = () => {
    const { data } = useContext(DataContext);
    const { mode } = useContext(ModeContext);
    const margin = { top: 30, right: 20, bottom: 80, left: 50 };
    const width = 450 - margin.left - margin.right;
    const height = 420 - margin.top - margin.bottom;
    const svgRef = useRef();
    
    useEffect(() => {
        if (!data || !Array.isArray(data) || data.length === 0) return;
        const yearData = d3.rollups(
            data,
            v => v,
            d => new Date(d.ts).getFullYear()
        )
            .map(d => ({ year: d[0], streams: d[1] }))
            .sort((a, b) => b.streams.length - a.streams.length);
        
        if (yearData.length === 0) return;
        
        const topYear = yearData[0];
        const yearStreams = topYear.streams;
        const topArtist = d3.rollups(
            yearStreams,
            v => v.length,
            d => d.master_metadata_album_artist_name
        )
            .sort((a, b) => b[1] - a[1])[0];
        const topAlbum = d3.rollups(
            yearStreams,
            v => v.length,
            d => d.master_metadata_album_album_name
        )
            .sort((a, b) => b[1] - a[1])[0];
        const topTrack = d3.rollups(
            yearStreams,
            v => v.length,
            d => d.master_metadata_track_name,
        )
            .sort((a, b) => b[1] - a[1])[0];
        
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        
        svg
            .attr("width", width)
            .attr("height", height);
        
        const textColor = mode === 'light' ? '#040605' : '#f9fbfa';
        const accentColor = mode === 'light' ? '#4ba3c3' : '#55d89b';
        
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 60)
            .attr("text-anchor", "middle")
            .attr("font-size", "64px")
            .attr("font-weight", "bold")
            .attr("fill", accentColor)
            .text(topYear.year);
        
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 100)
            .attr("text-anchor", "middle")
            .attr("font-size", "20px")
            .attr("fill", textColor)
            .text(`${yearStreams.length.toLocaleString()} streams`);
        
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 160)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")
            .attr("fill", accentColor)
            .text("Top Artist:");
        
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 185)
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .attr("fill", textColor)
            .text(topArtist ? topArtist[0] : 'Unknown');
        
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 230)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")
            .attr("fill", accentColor)
            .text("Top Album:");
        
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 255)
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .attr("fill", textColor)
            .text(topAlbum ? topAlbum[0] : 'Unknown');
        
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 300)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")
            .attr("fill", accentColor)
            .text("Top Track:");
        
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 325)
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .attr("fill", textColor)
            .text(topTrack ? topTrack[0] : 'Unknown');

    }, [data, mode]);

    return <svg ref={svgRef}></svg>;
}

export default BiggestYear;