// // for Ransom Posts
// document.addEventListener('DOMContentLoaded', async () => {
//     try {
//         const response = await fetch('/api/posts');

//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }

//         const posts = await response.json();
//         console.log('Posts fetched:', posts);

//         const postsBody = document.getElementById('postsBody');
//         if (!postsBody) {
//             throw new Error('postsBody element not found');
//         }

//         postsBody.innerHTML = '';  // Clear existing data

//         posts.forEach(post => {
//             const row = document.createElement('tr');

//             // Create date cell
//             const dateCell = document.createElement('td');
//             dateCell.textContent = post.discovered || 'N/A';
//             row.appendChild(dateCell);

//             // Create group name cell
//             const groupCell = document.createElement('td');
//             groupCell.textContent = post.group_name || 'N/A';
//             row.appendChild(groupCell);

//             // Create title cell
//             const titleCell = document.createElement('td');
//             titleCell.textContent = post.post_title || 'N/A';
//             row.appendChild(titleCell);

//             // Append row to table body
//             postsBody.appendChild(row);
//         });
//     } catch (error) {
//         console.error('Error fetching data:', error.message);
//     }
// });
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/posts');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const posts = await response.json();
        console.log('Posts fetched:', posts);

        // Sort posts in descending order by the discovered date
        posts.sort((a, b) => {
            const dateA = new Date(a.discovered);
            const dateB = new Date(b.discovered);
            return dateB - dateA; // Descending order
        });

        const postsBody = document.getElementById('postsBody');
        if (!postsBody) {
            throw new Error('postsBody element not found');
        }
        postsBody.innerHTML = ''; // Clear existing data

        posts.forEach(post => {
            const row = document.createElement('tr');
            const discoveredDate = new Date(post.discovered);
            const formattedDate = discoveredDate.toLocaleDateString('en-IN'); // Only the date part

            row.innerHTML = `
                <td>${formattedDate || 'N/A'}</td>
                <td>${post.group_name || 'N/A'}</td>
                <td>${post.post_title || 'N/A'}</td>
            `;
            postsBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching posts:', error.message);
    }
});
