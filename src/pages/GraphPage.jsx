
import DeviceStats from '../components/graphs/DeviceStats';
import MostSkipped from '../components/graphs/mostSkipped';
import BiggestStreamingDays from '../components/graphs/biggestStreamingDays';
import MostPicked from '../components/graphs/mostPicked';
import KeywordOccurences from '../components/graphs/keywordOccurences';
import Top5Artists from '../components/graphs/boring/top5Artists.jsx';
import Top5Albums from '../components/graphs/boring/top5Albums.jsx';
import Top5Tracks from '../components/graphs/boring/top5Tracks.jsx';
import ListeningMap from '../components/graphs/listeningMap.jsx';
import BiggestYear from '../components/graphs/boring/biggestYear.jsx';
import DeviceStatsText from '../components/graphs/DeviceStatsText.jsx';
import TotalStreamingTime from '../components/graphs/boring/totalStreamingTime.jsx';

import React, { useContext } from "react";
import { DataContext } from '../contexts/DataContext.jsx';
import Row from '../components/Row.jsx';
import Wrapper from '../components/Wrapper.jsx';
import { NameContext } from '../contexts/NameContext.jsx';

function GraphPage() {
    const { uName, changeName } = useContext(NameContext);

    return (
        <Wrapper>
            <h1>{uName}'s Spotify Mapped</h1>

            <ListeningMap></ListeningMap>
            <Row>
                <DeviceStats></DeviceStats>
                <DeviceStatsText></DeviceStatsText>
            </Row>
            <Row>
                <div id="col-1">
                    <h3>Most Skipped Tracks</h3>
                    <MostSkipped></MostSkipped>
                    <h4>What a hater...</h4>
                </div>
                <div id="col-2">
                    <h3>Biggest Streaming Days</h3>
                    <BiggestStreamingDays></BiggestStreamingDays>
                    <h4>What were you up to?</h4>
                </div>
                <div id="col-3">
                    <h3>Most Picked Tracks</h3>
                    <MostPicked></MostPicked>
                    <h4>Love this for you!</h4>
                </div>
            </Row>
            <h2>Feeling Boring?</h2>
            <h3>Fine, here's the "normal" stats.</h3>
            <Row>
                <div id="col-1"><Top5Artists></Top5Artists></div>
                <div id="col-2"><Top5Albums></Top5Albums></div>
                <div id="col-3"><Top5Tracks></Top5Tracks></div>
            </Row>
            <Row>
                <div id="col-1">
                    <h3>Total Streaming Time</h3>
                    <TotalStreamingTime></TotalStreamingTime>
                </div>
                <div id="col-2">
                    <h3>Biggest Year for Streaming</h3>
                    <BiggestYear></BiggestYear>
                </div>
                <div id="col-3">
                    <h3>Top Title Keywords</h3>
                    <KeywordOccurences></KeywordOccurences>
                </div>
            </Row>
        </Wrapper >
    )
}

export default GraphPage;
