const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test table existence by counting records
    const count = await prisma.mockConfig.count();
    console.log(`✅ MockConfig table exists with ${count} records`);
    
    // Test creating a simple record
    const testConfig = await prisma.mockConfig.create({
      data: {
        endpoint: '/test',
        method: 'GET',
        response: { message: 'test' },
        statusCode: 200
      }
    });
    console.log('✅ Created test record:', testConfig.id);
    
    // Clean up test record
    await prisma.mockConfig.delete({
      where: { id: testConfig.id }
    });
    console.log('✅ Cleaned up test record');
    
    console.log('🎉 Database is working correctly!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();