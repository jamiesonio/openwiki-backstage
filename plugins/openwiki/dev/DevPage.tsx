import { Content, Header, Page } from '@backstage/core-components';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  makeStyles,
} from '@material-ui/core';
import { useMemo, useState } from 'react';
import { fixtureNames, fixtures, FixtureName } from '../src/__fixtures__';
import { OpenWikiExplorer } from '../src/components/OpenWikiExplorer';
import { InvalidGraphPanel, MissingGraphState } from '../src/components/states';
import { GraphValidationError, parseWikiGraph } from '../src/schema/schema';
import { Progress } from '@backstage/core-components';

type Scenario = 'ready' | 'missing' | 'invalid' | 'loading';

const useStyles = makeStyles(theme => ({
  controls: {
    display: 'flex',
    gap: theme.spacing(2),
    alignItems: 'flex-end',
    marginBottom: theme.spacing(2),
    flexWrap: 'wrap',
  },
  control: { minWidth: 220 },
}));

/**
 * Renders the tab body straight from the bundled fixtures: no TechDocs, no
 * catalog, no backend. `yarn workspace @internal/plugin-openwiki start`.
 */
export const DevPage = () => {
  const classes = useStyles();
  const [fixture, setFixture] = useState<FixtureName>('openwiki-repo');
  const [scenario, setScenario] = useState<Scenario>('ready');

  const graph = useMemo(() => parseWikiGraph(fixtures[fixture]), [fixture]);

  const invalidError = useMemo(() => {
    const broken = JSON.parse(JSON.stringify(fixtures['edge-cases']));
    broken.nodes[1].size = 'eighty-one';
    delete broken.nodes[2].backlinks;
    try {
      parseWikiGraph(broken);
    } catch (e) {
      return e as GraphValidationError;
    }
    throw new Error('expected the broken fixture to fail validation');
  }, []);

  const fakeTechdocsHref = (nodeId: string) =>
    `/docs/default/component/demo/openwiki/${nodeId}/`;

  let body;
  switch (scenario) {
    case 'missing':
      body = (
        <MissingGraphState graphUrl="http://localhost:7007/api/techdocs/static/docs/default/component/demo/openwiki-graph/graph.json" />
      );
      break;
    case 'invalid':
      body = (
        <InvalidGraphPanel error={invalidError} graphUrl="(dev fixture)" />
      );
      break;
    case 'loading':
      body = <Progress />;
      break;
    default:
      body = (
        <OpenWikiExplorer
          key={fixture}
          graph={graph}
          techdocsHref={fakeTechdocsHref}
        />
      );
  }

  return (
    <Page themeId="documentation">
      <Header
        title="OpenWiki plugin dev page"
        subtitle="Rendered from bundled fixtures"
      />
      <Content>
        <div className={classes.controls}>
          <FormControl className={classes.control}>
            <InputLabel id="fixture-label">Fixture</InputLabel>
            <Select
              labelId="fixture-label"
              value={fixture}
              onChange={e => setFixture(e.target.value as FixtureName)}
            >
              {fixtureNames.map(name => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl className={classes.control}>
            <InputLabel id="scenario-label">State</InputLabel>
            <Select
              labelId="scenario-label"
              value={scenario}
              onChange={e => setScenario(e.target.value as Scenario)}
            >
              <MenuItem value="ready">ready (graph + reader)</MenuItem>
              <MenuItem value="missing">missing graph.json</MenuItem>
              <MenuItem value="invalid">invalid graph.json</MenuItem>
              <MenuItem value="loading">loading</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" color="textSecondary">
            Toggle the theme from the sidebar settings to check dark mode.
          </Typography>
        </div>
        {body}
      </Content>
    </Page>
  );
};
