import { SylvaHero, SylvaLivingWorldScene } from "@designcodeio/threeui";
import '@designcodeio/threeui/style.css';
// import styles from './index.less';

const Scene = () => {
    return (
        // <div className="shader-frame">
        //     <SylvaHero
        //         style={{ width: "100%", height: "100vh" }}
        //         headingFont="Newsreader"
        //         bodyFont="Newsreader"
        //         headingWeight="300"
        //         bodyWeight="300"
        //         primaryColor="#ffffff"
        //         headingSize={63}
        //         bodySize={16.5}
        //         headingLetterSpacing={-0.006}

        //     />
        // </div>

        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100vh' }}>
                <SylvaLivingWorldScene
                    
                />
            </div>
            {/* <SylvaHero
                style={{ width: "100%", height: "100vh" }}
                headingFont="Newsreader"
                bodyFont="Newsreader"
                headingWeight="300"
                bodyWeight="300"
                primaryColor="#ffffff"
                headingSize={63}
                bodySize={16.5}
                headingLetterSpacing={-0.006}

            /> */}

            <div style={{ position: 'relative', zIndex: 1, color: '#fff' }}>

                <div>按钮测试</div>
            </div>
        </div>
    )
};

export default Scene;