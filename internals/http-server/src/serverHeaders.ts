export const serverHeaders = [
  {
    "source": "**/*",
    "headers": [
      {
        "key": "Bypass-Tunnel-Reminder",
        "value": "true",
      },
      {
        "key": "Access-Control-Allow-Origin",
        "value": "*",
      },
      {
        "key": "Access-Control-Allow-Headers",
        "value": "Origin, X-Requested-With, Content-Type, Accept, Range",
      }
    ]
  }
];
