const pool = require('./pool');

async function migrateFamilles() {
  try {
    // Check if familles table exists and has data
    const checkResult = await pool.query('SELECT COUNT(*) FROM familles');
    const count = parseInt(checkResult.rows[0].count);
    
    if (count > 0) {
      console.log('✅ Familles table already has data, skipping migration');
      return;
    }

    // Get data from section_content
    const sectionResult = await pool.query(
      "SELECT content FROM section_content WHERE section_type = 'famille_categories'"
    );

    if (sectionResult.rows.length === 0) {
      console.log('⚠️ No famille_categories section found, skipping migration');
      return;
    }

    const section = sectionResult.rows[0];
    let content = section.content;

    // Handle both array and object with items property
    if (content && typeof content === 'object') {
      if (!Array.isArray(content) && content.items && Array.isArray(content.items)) {
        content = content.items;
      } else if (!Array.isArray(content)) {
        content = [];
      }
    } else {
      content = [];
    }

    if (!Array.isArray(content) || content.length === 0) {
      console.log('⚠️ No familles data found in section_content, skipping migration');
      return;
    }

    // Insert familles into familles table
    for (const famille of content) {
      await pool.query(
        `INSERT INTO familles (id, title, image, subcategories, created_at, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           image = EXCLUDED.image,
           subcategories = EXCLUDED.subcategories,
           updated_at = NOW()`,
        [
          famille.id,
          famille.title,
          famille.image || null,
          JSON.stringify(famille.subcategories || [])
        ]
      );
    }

    console.log(`✅ Migrated ${content.length} familles from section_content to familles table`);
  } catch (error) {
    console.error('❌ Error migrating familles:', error.message);
    throw error;
  }
}

if (require.main === module) {
  migrateFamilles()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateFamilles;

