// ============================================================
// CLEANUP ALL OLD LOCAL FILE REFERENCES
// ============================================================
require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') });
const supabase = require('../config/supabase');

async function cleanup() {
    console.log('🧹 Starting cleanup...\n');

    try {
        // 1. Cleanup Gallery
        console.log('📸 Checking gallery...');
        const { data: galleryOld, error: g1 } = await supabase
            .from('gallery')
            .select('id, image_url')
            .or('image_url.like.img/gallery/%,image_url.like.%1769%-%,image_url.not.like.https://%');

        if (g1) throw g1;

        if (galleryOld && galleryOld.length > 0) {
            console.log(`   Found ${galleryOld.length} old gallery records`);
            galleryOld.forEach(r => console.log(`   - ID ${r.id}: ${r.image_url}`));
            
            const { error: delG } = await supabase
                .from('gallery')
                .delete()
                .in('id', galleryOld.map(r => r.id));
            
            if (delG) throw delG;
            console.log(`   ✅ Deleted ${galleryOld.length} records\n`);
        } else {
            console.log('   ✅ Gallery is clean\n');
        }

        // 2. Cleanup Members (except default placeholders)
        console.log('👥 Checking members...');
        const { data: membersOld, error: m1 } = await supabase
            .from('members')
            .select('id, name, image_url')
            .like('image_url', 'img/member/%')
            .not('image_url', 'in', '(img/member/placeholder.webp,img/member/NEaca.webp,img/member/NEsinta.webp,img/member/group.webp)');

        if (m1) throw m1;

        if (membersOld && membersOld.length > 0) {
            console.log(`   Found ${membersOld.length} old member records`);
            membersOld.forEach(r => console.log(`   - ID ${r.id} (${r.name}): ${r.image_url}`));
            
            const { error: delM } = await supabase
                .from('members')
                .delete()
                .in('id', membersOld.map(r => r.id));
            
            if (delM) throw delM;
            console.log(`   ✅ Deleted ${membersOld.length} records\n`);
        } else {
            console.log('   ✅ Members are clean\n');
        }

        console.log('✅ Cleanup complete! Database is ready for Supabase Storage uploads.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
        process.exit(1);
    }
}

cleanup();
