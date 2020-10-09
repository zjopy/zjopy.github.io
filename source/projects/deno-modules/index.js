const table = document.getElementById("table");
const tbody = table.getElementsByTagName("tbody")[0];

async function fetchTopics(page = 1) {
  // note: 10 unauthenticated requests per minute, then throws error
  let response = await fetch(
    "https://api.github.com/search/repositories?q=topic:deno&archived:false&page=" +
      page,
    {
      headers: {
        // developers preview, may change https://developer.github.com/v3/search/#search-repositories
        Accept: "application/vnd.github.mercy-preview+json",
      },
    }
  );
  if (response.status === 200) {
    return await response.json();
  } else {
    throw new Error(response.statusText);
  }
}

loadTable().catch((error) => {
  console.log("Ups!", error);
});

async function loadTable() {
  const data = await fetchTopics(1);

  const pages = Math.trunc(data.total_count / 30) + 1;

  console.log(`building page 1/${pages}...`);
  buildPage(data.items);

  for (i = 2; i <= pages; i++) {
    console.log(`building page ${i}/${pages}...`);
    const data = await fetchTopics(i);
    buildPage(data.items);
  }
}

function buildPage(items) {
  const DF = document.createDocumentFragment();

  items.forEach(
    ({
      description,
      html_url: repoURL,
      name: repoName,
      owner: { login: userName, html_url: userURL },
      stargazers_count: stars,
    }) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
          <td><a href="${userURL}">${userName}</a></td>
          <td><a href="${repoURL}">${repoName}</a></td>
          <td>${description}</td>
          <td>${stars}</td>
          <td><a href="${repoURL}/blob/master/mod.ts">mod.ts</a></td>
          `;
      DF.append(tr);
    }
  );

  tbody.append(DF);
}
