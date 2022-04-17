import React, {useState} from 'react';
import {ProjectProp, StreamSetupBody, StreamSetupFooter, StreamSetupSectionLabel} from './StreamSetupCommon';
import {TextInput} from '../../Library/View/TextInput';
import {Button} from '../../Library/View/Button';
import {color} from '../../Library/Style/color';
import {StreamRepo} from '../../Repository/StreamRepo';
import {Loading} from '../../Library/View/Loading';
import {View} from '../../Library/View/View';
import {StreamPolling} from '../../Repository/Polling/StreamPolling';
import {TimerUtil} from '../../Library/Util/TimerUtil';

type Props = {
  show: boolean;
  repos: string[];
  teams: string[];
  projects: ProjectProp[];
  onFinish: () => void;
}

export const StreamSetupConfirmFragment: React.FC<Props> = (props) => {
  const [isLoading, setIsLoading] = useState(false);
  const repoQuery = props.repos.map(repo => `repo:${repo}`).join(' ');
  const teamMentionQuery = props.teams.map(team => `team:${team}`).join(' ');
  const teamReviewRequestedQuery = props.teams.map(team => `team-review-requested:${team}`).join(' ');
  const projectQueries = props.projects.map(project => project.url);

  const projectQueryViews = projectQueries.map(projectUrl => {
    return <TextInput key={projectUrl} onChange={() => null} value={projectUrl} readOnly={true}/>;
  });

  async function createStreams() {
    setIsLoading(true);
    await createRepoStreams(props.repos);
    await createTeamStreams(props.teams);
    await createProjectStreams(props.projects);
    await StreamPolling.restart();
    await TimerUtil.sleep(1000);
    props.onFinish();
  }

  return (
    <StreamSetupBody style={{display: props.show ? undefined : 'none'}}>
      {props.repos.length > 0 && (
        <>
          <StreamSetupSectionLabel>リポジトリ</StreamSetupSectionLabel>
          <TextInput onChange={() => null} value={repoQuery} readOnly={true}/>
        </>
      )}

      {props.teams.length > 0 && (
        <>
          <StreamSetupSectionLabel>チームメンション</StreamSetupSectionLabel>
          <TextInput onChange={() => null} value={teamMentionQuery} readOnly={true}/>

          <StreamSetupSectionLabel>チームレビューリクエスト</StreamSetupSectionLabel>
          <TextInput onChange={() => null} value={teamReviewRequestedQuery} readOnly={true}/>
        </>
      )}

      {props.projects.length > 0 && (
        <>
          <StreamSetupSectionLabel>プロジェクト</StreamSetupSectionLabel>
          {projectQueryViews}
        </>
      )}

      <StreamSetupFooter>
        <Loading show={isLoading}/>
        <View style={{flex: 1}}/>
        <Button onClick={() => createStreams()}>ストリームの作成</Button>
      </StreamSetupFooter>
    </StreamSetupBody>
  );
}

async function createRepoStreams(repos: string[]) {
  if (repos.length === 0) return;

  // create stream
  const iconColor = color.stream.green;
  const query = repos.map(repo => `repo:${repo}`).join(' ');
  const {error, stream} = await StreamRepo.createStream('UserStream', null, 'Repo', [query], [], 1, iconColor);
  if (error) {
    console.error(error);
    return;
  }

  // create filter
  for (const repo of repos) {
    const shortName = repo.split('/')[1];
    await StreamRepo.createStream('FilterStream', stream.id, `${shortName}`, [], [`repo:${repo}`], 1, iconColor);
  }
}

async function createTeamStreams(teams: string[]) {
  if (teams.length === 0) return;

  // create stream
  const iconColor = color.stream.navy;
  const teamMentionQuery = teams.map(team => `team:${team}`).join(' ');
  const teamReviewRequestedQuery = teams.map(team => `team-review-requested:${team}`).join(' ');
  const {error, stream} = await StreamRepo.createStream('UserStream', null, 'Team', [teamMentionQuery, teamReviewRequestedQuery], [], 1, iconColor);
  if (error) {
    console.error(error);
    return;
  }

  // create filter
  for (const team of teams) {
    await StreamRepo.createStream('FilterStream', stream.id, `${team} mentions`, [], [`team:${team}`], 1, iconColor);
    await StreamRepo.createStream('FilterStream', stream.id, `${team} review requested`, [], [`review-requested:${team}`], 1, iconColor);
  }
}

async function createProjectStreams(projects: ProjectProp[]) {
  if (projects.length === 0) return;

  const iconColor = color.stream.orange;
  for (const project of projects) {
    await StreamRepo.createStream('ProjectStream', null, project.title, [project.url], [], 1, iconColor);
  }
}
