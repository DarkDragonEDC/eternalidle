fetch('http://127.0.0.1:3000/api/active_players').then(r => r.json()).then(data => {
    let found = false;
    data.forEach(p => {
        const inv = p.state?.inventory || {};
        const keys = Object.keys(inv).filter(k => k.toLowerCase().includes('map') || k.toLowerCase().includes('t1_'));
        if (keys.length > 0) {
            found = true;
            console.log('Player', p.name, 'has maps:');
            keys.forEach(k => console.log(`  '${k}':`, inv[k]));
        }
    });
    if (!found) console.log('No maps found in active players.');
});
