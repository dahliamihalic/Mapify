import Wrapper from "../components/Wrapper";
import { Link } from "react-router-dom";
import UploadWizard from "../components/UploadWizard";

const HomePage = () => {
    return (
        <Wrapper>
            <div className ="Mapify-Logo" />
            <h2>Spotify Analysis Tool</h2>
            <UploadWizard></UploadWizard>
        </Wrapper>
    )
}
export default HomePage;
