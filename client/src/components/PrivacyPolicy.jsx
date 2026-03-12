import React from 'react';

const PrivacyPolicy = () => {
    return (
        <div style={{
            padding: '40px 20px',
            maxWidth: '800px',
            margin: '0 auto',
            color: '#e0e0e0',
            lineHeight: '1.6',
            fontFamily: "'Inter', sans-serif"
        }}>
            <h1 style={{ color: '#d4af37', borderBottom: '1px solid #d4af3733', paddingBottom: '10px' }}>Privacy Policy</h1>
            <p>Last updated: {new Date().toLocaleDateString()}</p>

            <section>
                <h2 style={{ color: '#d4af37' }}>1. Introduction</h2>
                <p>Welcome to Eternal Idle ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This privacy policy applies to all information collected through our game, Eternal Idle.</p>
            </section>

            <section>
                <h2 style={{ color: '#d4af37' }}>2. Information We Collect</h2>
                <p>We collect personal information that you voluntarily provide to us when you register for an account (via Supabase/Google Auth), such as your name, email address, and profile picture. We also collect game data associated with your account, including your character progress, inventory, and stats.</p>
            </section>

            <section>
                <h2 style={{ color: '#d4af37' }}>3. How We Use Your Information</h2>
                <p>We use the information we collect to:</p>
                <ul>
                    <li>Provide, operate, and maintain our game.</li>
                    <li>Improve and personalize your gaming experience.</li>
                    <li>Communicate with you regarding your account and updates.</li>
                    <li>Authenticate users and prevent fraud or abuse.</li>
                </ul>
            </section>

            <section>
                <h2 style={{ color: '#d4af37' }}>4. Data Protection</h2>
                <p>We use industry-standard security measures to protect your personal information. Your authentication data is handled securely by Supabase and Google.</p>
            </section>

            <section>
                <h2 style={{ color: '#d4af37' }}>5. Third-Party Services</h2>
                <p>We use third-party services like Supabase for authentication and data storage. These services have their own privacy policies.</p>
            </section>

            <section>
                <h2 style={{ color: '#d4af37' }}>6. Contact Us</h2>
                <p>If you have questions or comments about this policy, you may contact us at euller.edc@gmail.com.</p>
            </section>
            
            <div style={{ marginTop: '40px', textAlign: 'center' }}>
                <button 
                    onClick={() => window.location.href = '/'}
                    style={{
                        background: '#d4af37',
                        color: '#000',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '5px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    BACK TO GAME
                </button>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
