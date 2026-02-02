// Script untuk mengecek data gallery di database
require('dotenv').config();
const supabase = require("../config/supabase");

async function checkGallery() {
    try {
        console.log('Checking gallery data...\n');
        
        const { data, error } = await supabase
            .from('gallery')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error:', error);
            return;
        }

        console.log(`Total images: ${data ? data.length : 0}\n`);
        
        if (data && data.length > 0) {
            // Group by category
            const byCategory = {};
            data.forEach(item => {
                const cat = item.category || 'no-category';
                if (!byCategory[cat]) byCategory[cat] = [];
                byCategory[cat].push(item);
            });

            console.log('Images by category:');
            Object.keys(byCategory).forEach(cat => {
                console.log(`  ${cat}: ${byCategory[cat].length} images`);
            });

            console.log('\n--- All Gallery Items ---');
            data.forEach((item, idx) => {
                console.log(`${idx + 1}. ID: ${item.id}`);
                console.log(`   Category: ${item.category || 'NOT SET'}`);
                console.log(`   Image: ${item.image_url}`);
                console.log(`   Alt Text: ${item.alt_text || 'NOT SET'}`);
                console.log(`   Member ID: ${item.member_id || 'NOT SET'}`);
                console.log('');
            });
        } else {
            console.log('No gallery images found in database!');
            console.log('\nPossible reasons:');
            console.log('1. Gallery table might not exist');
            console.log('2. No images have been uploaded yet');
            console.log('3. Database connection issue');
        }
    } catch (e) {
        console.error('Failed to check gallery:', e.message);
    }
}

checkGallery();
