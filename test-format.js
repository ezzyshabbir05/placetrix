const code = "class Solution{public:int missingNumber(vector<int>& nums){int n=nums.size();int expectedSum=(n*(n+1))/2;int actualSum=0;for(int num:nums){actualSum+=num;}return expectedSum-actualSum;}}";

fetch('http://localhost:3000/api/logiclab/format', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code, language: 'cpp' })
})
.then(res => res.text())
.then(console.log)
.catch(console.error);
