import Wrapper from "../components/Wrapper";
import { Link } from "react-router-dom";
import CsvUploader from "../components/CsvUploader";
import InfoForm from "../components/infoForm";

const HomePage = () => {
    return (
        <Wrapper>
            <div className ="Mapify-Logo" />
            <h2>Spotify Analysis Tool</h2>
            <CsvUploader></CsvUploader>
            <InfoForm></InfoForm>
        </Wrapper>
    )
}
export default HomePage;
