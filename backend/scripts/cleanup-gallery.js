// ============================================================
// QUICK FIX: Cleanup Old Gallery Records
// ============================================================
// Run this once to clean old local file references from database
// node backend/scripts/cleanup-gallery.js

require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') });
const supabase = require('../config/supabase');

async function cleanupGallery() {
    console.log('🧹 Starting gallery cleanup...\n');

    try {
        // 1. Get all records with local paths
        const { data: oldRecords, error: fetchError } = await supabase
            .from('gallery')
            .select('*')
            .like('image_url', 'img/gallery/%');

        if (fetchError) throw fetchError;

        if (!oldRecords || oldRecords.length === 0) {
            console.log('✅ No old records found. Database is clean!');
            return;
        }

        console.log(`Found ${oldRecords.length} old records with local paths:`);
        oldRecords.forEach(record => {
            console.log(`  - ID ${record.id}: ${record.image_url}`);
        });

        // 2. Delete old records
        const { error: deleteError } = await supabase
            .from('gallery')
            .delete()
            .like('image_url', 'img/gallery/%');

        if (deleteError) throw deleteError;

        console.log(`\n✅ Successfully deleted ${oldRecords.length} old records!`);
        console.log('📝 You can now upload new images using Supabase Storage.');

    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
        process.exit(1);
    }
}

async function cleanupMembers() {
    console.log('\n🧹 Checking member uploads...\n');

    try {
        const defaultImages = [
            '/img/member/placeholder.webp',
            'img/member/NEaca.webp',
            'img/member/NEsinta.webp',
            'img/member/group.webp'
        ];

        // Get members with local uploads (excluding defaults)
        const { data: oldMembers, error: fetchError } = await supabase
            .from('members')
            .select('*')
            .like('image_url', 'img/member/%')
            .not('image_url', 'in', `(${defaultImages.join(',')})`);

        if (fetchError) throw fetchError;

        if (!oldMembers || oldMembers.length === 0) {
            console.log('✅ No old member uploads found. Database is clean!');
            return;
        }

        console.log(`Found ${oldMembers.length} members with uploaded photos:`);
        oldMembers.forEach(member => {
            console.log(`  - ${member.name}: ${member.image_url}`);
        });

        console.log('\n⚠️  To delete these, uncomment the delete code in the script.');

        // Uncomment to actually delete:
        /*
        const { error: deleteError } = await supabase
            .from('members')
            .delete()
            .like('image_url', 'img/member/%')
            .not('image_url', 'in', `(${defaultImages.join(',')})`);

        if (deleteError) throw deleteError;
        console.log(`✅ Deleted ${oldMembers.length} member records!`);
        */

    } catch (error) {
        console.error('❌ Member cleanup check failed:', error.message);
    }
}

// Run cleanup
(async () => {
    await cleanupGallery();
    await cleanupMembers();
    console.log('\n✨ Cleanup complete! Your database is ready for Supabase Storage uploads.');
})();
