const https = require('https');
const fs = require('fs');

const mermaidCode = `flowchart TD
    classDef default fill:#ffffff,stroke:#333,stroke-width:1.5px,color:#000
    classDef lane fill:#f8f9fa,stroke:#2c3e50,stroke-width:3px,color:#2c3e50,stroke-dasharray: 5 5
    
    subgraph L1 [ "🟦 LÀN: USER / STUDENT" ]
        direction LR
        U_Acc[Access System] --> U_Log[Login] & U_Reg[Register]
        U_Log --> U_LogF[Login Form]
        U_Reg --> U_RegF[Register Form]
        U_RegF --> U_Ver[Verify Account]
        
        U_Dash[Dashboard] --> U_Set[Account Settings] --> U_Pwd[Change Password]
    end
    
    subgraph L2 [ "🟩 LÀN: SYSTEM" ]
        direction LR
        S_Val[Validate Information] --> S_Dec{Valid?}
        S_Dec -- NO --> S_Err[Show Error Message]
        S_Dec -- YES --> S_Ses[Create Login Session]
        S_Ses --> S_Role[Assign User Role] --> S_Dash[Dashboard]
    end
    
    subgraph L3 [ "🟧 LÀN: DATABASE" ]
        direction LR
        D_SaveU[Save User Information]
        D_SaveS[Save Login Status]
        D_UpdP[Update Password]
    end
    
    subgraph L4 [ "🟪 LÀN: ADMIN" ]
        direction LR
        A_Pan[Admin Panel] --> A_Man[Manage Users]
        A_Man --> A_AR[Assign Roles] & A_Dis[Disable Account] & A_View[View User Info]
    end

    U_LogF --> S_Val
    U_Ver --> S_Val
    U_RegF --> D_SaveU
    
    S_Err -.-> U_LogF
    
    S_Ses --> D_SaveS
    S_Dash --> U_Dash
    S_Dash --> A_Pan
    
    U_Pwd --> D_UpdP

    class L1,L2,L3,L4 lane`;

const options = {
  hostname: 'kroki.io',
  port: 443,
  path: '/mermaid/png',
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(mermaidCode)
  }
};

const req = https.request(options, (res) => {
  const fileStream = fs.createWriteStream('c:\\github\\AIStudyHub\\docs\\authentication_swimlane.png');
  res.pipe(fileStream);
  fileStream.on('finish', () => {
    console.log('Saved image');
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.write(mermaidCode);
req.end();
