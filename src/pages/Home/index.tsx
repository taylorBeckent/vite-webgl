import { Button } from '@mui/material'
import React, { useEffect } from 'react';

const PERSON_LIST = [
    { loginName: 'CS1001', name: '张三' },
    { loginName: 'CS1002', name: '李四' },
    { loginName: 'CS1003', name: '王朝' },
    { loginName: 'CS1004', name: '马汉' },
    { loginName: 'CS1005', name: '周文' },
    { loginName: 'CS1006', name: '赵武' },
];

const Home = () => {

    useEffect(() => {
        const raw = (e: MessageEvent) => console.log('门户 RAW message:', e.origin, e.data);
        window.addEventListener('message', raw);
        return () => window.removeEventListener('message', raw);
    }, []);

    interface Person {
        loginName: string,
        name: string
    };

    const autoTestJump = (record: Person) => {
        const params = { ...record, type: 'SSO_PARAMS' };
        const AUTOTEST_URI = `http://192.168.249.59:8000`;
        const autoTestWindow: Window | null = window.open(AUTOTEST_URI, '_blank');
        console.log("params", params);
        console.log("autoTestWindow", autoTestWindow);
        const onMessage = (e: MessageEvent) => {

            console.log('e---门户项目', e);
            if (e.origin !== AUTOTEST_URI) return;
            console.log('1');
            if (e.source !== autoTestWindow) return;
            console.log('2');
            if (e.data?.type !== 'AUTOTEST_READY') return;
            console.log('3');

            autoTestWindow?.postMessage(params, AUTOTEST_URI);
            window.removeEventListener('message', onMessage);
        }

        window.addEventListener('message', onMessage);
    };

    return (
        <div>
            {/* <Button onClick={autoTestJump} >跳转至自动化测试平台</Button> */}
            {PERSON_LIST.map(item => (
                <Button onClick={() => autoTestJump(item)} >{item.name}</Button>
            ))}
        </div>
    )
}

export default Home;