import Peel from '@components/canvasui/Peel';

const CanvasUIOne = () => {
    return (
        <div style={{ width: '100%', height: '100vh' }}>
            <Peel style={{ width: '100%', height: '100%' }} under={<div>下层内容</div>} >
                <div>上层内容（鼠标靠近边缘会被揭开）</div>
            </Peel>
        </div>
    )
}

export default CanvasUIOne;