const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Test the meeting accept/decline API endpoints
const testMeetingAPI = async () => {
  const baseURL = 'http://localhost:5000/api';
  
  // First, let's try to login and get a token
  console.log('=== Testing Meeting Accept/Decline API ===');
  
  try {
    // Login as entrepreneur
    console.log('\n1. Logging in as entrepreneur...');
    const loginResponse = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'arzishkhan454@gmail.com',
        password: 'arzish122',
        userType: 'entrepreneur'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response status:', loginResponse.status);
    console.log('Login response:', loginData);
    
    if (!loginResponse.ok) {
      console.log('Login failed, cannot proceed with meeting tests');
      return;
    }
    
    const token = loginData.accessToken;
    console.log('Token obtained:', token ? 'Yes' : 'No');
    
    // 2. Test accepting the specific meeting
    const testMeetingId = '68b6acfa0b846797d5414daf';
    console.log(`\n2. Trying to accept meeting ${testMeetingId}...`);
    
    const acceptResponse = await fetch(`${baseURL}/meetings/${testMeetingId}/accept`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Accept response status:', acceptResponse.status);
    const acceptData = await acceptResponse.json();
    console.log('Accept response:', acceptData);
    
    if (acceptResponse.status === 200) {
      console.log('✅ Meeting accepted successfully!');
      
      // 3. Now try to decline the same meeting
      console.log(`\n3. Trying to reject meeting ${testMeetingId}...`);
      
      const declineResponse = await fetch(`${baseURL}/meetings/${testMeetingId}/reject`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Reject response status:', declineResponse.status);
      const declineData = await declineResponse.json();
      console.log('Reject response:', declineData);
      
      if (declineResponse.status === 200) {
        console.log('✅ Meeting rejected successfully!');
        console.log('\n🎉 Accept/Reject functionality is working correctly!');
      } else {
        console.log('❌ Failed to reject meeting');
      }
    } else {
      console.log('❌ Failed to accept meeting');
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
};

testMeetingAPI();