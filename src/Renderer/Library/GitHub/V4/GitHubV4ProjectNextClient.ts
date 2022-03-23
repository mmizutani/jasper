import {GitHubV4Client} from './GitHubV4Client';
import {RemoteGitHubV4Entity} from '../../Type/RemoteGitHubV4/RemoteGitHubV4Entity';

type Field = {
  name: string;
  settings: string;
  dataType: 'TITLE' | 'SINGLE_SELECT' | 'ITERATION' | 'TEXT' | 'NUMBER' | 'DATE' | string;
}

type RemoteGitHubV4ProjectNext = {
  user?: {
    projectNext?: {
      fields: {
        nodes: Field[]
      }
    }
  }
  organization?: {
    projectNext?: {
      fields: {
        nodes: Field[]
      }
    }
  }
} & RemoteGitHubV4Entity;

export class GitHubV4ProjectNextClient extends GitHubV4Client {
  async getProjectStatusFieldNames(projectUrl: string): Promise<{error?: Error; names?: string[]}> {
    const query = this.buildQuery(projectUrl);
    const {error, data} = await this.request<RemoteGitHubV4ProjectNext>(query);
    if (error != null) return {error};

    const statusField = this.getStatusField(data);
    if (statusField == null) return {names: []};

    const settings = JSON.parse(statusField.settings) as {options: {name: string}[]};
    const names = settings.options.map(option => option.name);

    return {names};
  }

  private buildQuery(projectUrl: string): string {
    const [, orgOrUser, userName, , projectNumber] = new URL(projectUrl).pathname.split('/');
    const queryType = orgOrUser === 'orgs' ? 'organization' : 'user';
    return `
${queryType}(login: "${userName}") {
  projectNext(number: ${projectNumber}) {
    title
    fields(first: 100) {
      nodes {
        dataType
        name
        settings
      }
    }
  }
}
`;
  }

  private getStatusField(data: RemoteGitHubV4ProjectNext): Field | null {
    if (data.user?.projectNext != null) {
      return data.user.projectNext.fields.nodes.find(field => {
        return field.dataType === 'SINGLE_SELECT' && field.name.toLocaleLowerCase() === 'status' && field.settings != null
      });

    } else if (data.organization?.projectNext != null) {
      return data.organization.projectNext.fields.nodes.find(field => {
        return field.dataType === 'SINGLE_SELECT' && field.name.toLocaleLowerCase() === 'status' && field.settings != null
      });
    }
  }
}
