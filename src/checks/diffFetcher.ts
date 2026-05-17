export interface PrFile {
  filename: string;
  additions: number;
  patch?: string;
}

interface PullsOctokit {
  rest: {
    pulls: {
      listFiles: (params: {
        owner: string;
        repo: string;
        pull_number: number;
        per_page?: number;
      }) => Promise<{ data: Array<{ filename: string; additions: number; patch?: string }> }>;
    };
  };
}

export async function getPrFiles(
  octokit: PullsOctokit,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PrFile[]> {
  const response = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });
  return response.data.map((f) => ({
    filename: f.filename,
    additions: f.additions,
    patch: f.patch,
  }));
}
