import React from 'react';
import Select from 'react-select';
import InputNumber from 'react-input-number';
import axios from 'axios';

import Heatmap from 'components/Heatmap';
import CorrelationMatrix from 'components/CorrelationMatrix';
import ScatterPlot from 'components/ScatterPlot';
// import PatchTable from 'components/PatchTable';
import PatchVisualization from 'components/PatchVisualization';
import AnalysisScatter from 'components/AnalysisScatter';
import ClusteringScatterPlot from 'components/ClusteringScatterPlot';
import DurationBoxPlot from 'components/DurationBoxPlot';
import LengthBoxPlot from 'components/LengthBoxPlot';
import Stimulus from 'components/Stimulus';
import Patch from 'components/Patch';
import ScanpathVisualization from 'components/ScanpathVisualization';

import { AgGridColumn, AgGridReact } from 'ag-grid-react';

import '../../node_modules/ag-grid-enterprise';
import '../../node_modules/ag-grid-community/dist/styles/ag-grid.css';
import '../../node_modules/ag-grid-community/dist/styles/ag-theme-alpine.css';

const dataProcessingMethods = [
  { value: 'raw_data', label: 'raw data'},
  { value: 'min_max', label: 'min-max' },
  { value: 'z_score', label: 'z-score'}
];
const correlationMethods = [
  { value:'pearson', label: 'Pearson linear' },
  { value:'spearman', label: 'Spearman rank-order' },
  { value:'kendall', label: 'Kendall rank-order' }
];
const dataTransformation = [
  { value:'raw', label: 'Raw data' },
  { value:'min_max', label: 'Min-max' },
  { value:'z_score', label: 'z-score' },
  { value:'yeo_johonson', label: 'Yeo-Johonson' },
  { value:'yeo_johonson_min_max', label: 'Yeo-Johonson + Min-max' }
];
const dimensionalityReduction = [
  { value:'MDS', label: 'MDS (Multi Dimensional Scaling)' },
  { value:'PCA', label: 'PCA (Principal Component Analysis)' },
  { value:'ICA', label: 'ICA (Independent Component Aanalysis)' },
  { value:'t_SNE', label: 't-SNE' }
];
const clusteringAlgorithm = [
  { value:'random_forest', label: 'RandomForest' },
  { value:'dbscan', label: 'DBSCAN' },
  { value:'hdbscan', label: 'hDBSCAN' },
  { value:'k_means', label: 'k-Means' }
];
const patchSelectOption = [
  { value:'selected', label: 'Selected patches' },
  { value:'similar', label: 'Similar patches' }
];
const imageSimilarityOption = [
  { value:'MSE', label: 'MSE' },
  { value:'SSIM', label: 'SSIM' }
];

const tempSelectOption = [
  { value:'scanpath', label:'scanpath' },
  { value:'test', label:'test' }
];

const stimulusSwitchSelectOption = [
  { value:'on', label:'Stimulus On'},
  { value:'off', label:'Sitmulus Off'}
];
const scanpathSimilaritySelectOption = [
  { value:'jd', label: 'Jaccard Coefficient' },
  { value:'dtw', label: 'Dynamic Time Warping' },
  { value:'lcs', label: 'Longest Common Subsequence' },
  { value:'fd', label: 'Frechet Distance' },
  { value:'ed', label: 'Edit (Levenshtein) Distance' }
];

// options for patch visualization view
const patchVisualizationStyle = [
  { value:'clustering', label: 'Clustering Table' },
  { value:'scatterplot', label: 'Scatter Plot' }
];
const patchNodeStyle = [
  { value:'cluster', label: 'Cluster' },
  { value:'patch', label: 'Patch Image' }
];


let moveDestClusterOption = [];
const SIMILARITY_THRESHOLD = 0.8;

class Data extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      datasetList: [],
      fixationFilters: [],
      pIsDisabled: true,
      fIsDisabled: true,
      participants: [],
      featureTypes: [],
      stimulusTypes: [],
      spHeatmapDataURL: "",
      corrMatDataURL: "",
      selectedDataset: null,
      selectedParticipant: null,
      selectedFilter: null,
      selectedFilterName: "",
      selectedProcessMethod: null,
      selectedCorrelationMethod: null,
      feature_define: [],
      selected_feature_define: [],
      corr_feature_define: [],
      sti_class_define: [],
      scatter_axis: [],
      analysisScatterURL: "",
      patchURLs: [],
      numCluster: 0,
      selectedPatchIndex: 0,
      selectedPatchCluster: 0,
      selectedPatchOrder: 0,
      selectedPatchId: 0,
      patchData: [],
      filteredData: [],
      joinData: [],
      stimulusPath: "",
      patchFeatureImageURLs: [],
      stimulusData: [],
      patchSelectedFeature: -1,
      selectedPatchesTableIndex: [],
      lastSelectedPatchTableIndex: [0, 0],
      selectedPatchSelectOption: null,
      selectedSimilarityOption: null,
      datasetRecord: [{train: '0', test: '0'}],
      selectedDataTransformation: null,
      selectedDimensionReduction: null,
      selectedClusteringAlgorithm: null,
      similarPatchesId: [],
      similarPatchList: [],
      selectedMoveDestination: null,
      similarDisabled: true,
      updateScatterURL: "",
      selectedVisStyle: "",
      nodeSelectDisabledFlag: true,
      selectedNodeStyle: "",
      nodeSizeSpinnerValue: 10,
      dtfSelectDisableFlag: true,
      drSelectDisableFlag: true,
      cluSelectDisableFlag: true,
      selectedTempOption: null,
      selectedStimulusSwitchOption: null,
      stimulusSwitchDisableFlag: true,
      scanpathData: [],
      scanpathSimClu: [],
      selectSimilarityMethodOption: null,
      similaritySelectDeisableFlag: true,
      scanpathSimData: [],

    };
  }

  loadDatasetList = () =>{
    axios.get(`http://${window.location.hostname}:5000/static/dataset.csv?`+Math.random())
    .then(response => {
      // console.log(response.data);
      let dataset_options = [];
      for (let value of response.data.split('\n')){
        if(value.length>0){
          var _d = {
            "value": value.replace('\r', ''),
            "label": value.replace('\r', '')
          };
          dataset_options.push(_d);
        }
      }
      // console.log(dataset_options);
      this.setState({
        datasetList: dataset_options
      });
    });
  }

  loadParticipantsList = dataName => {
    axios.get(`http://${window.location.hostname}:5000/static/data/${dataName}/participants.csv?`+Math.random())
    .then(response => {
      // console.log(response.data);
      let participants_options = [];
      for (let value of response.data.split('\n')){
        if(value.length>0){
          var _d = {
            "value": value.replace('\r', ''),
            "label": value.replace('\r', '')
          };
          participants_options.push(_d);
        }
      }
      // console.log(participants_options);
      this.setState({
        participants: participants_options
      });
      this.setState({
        pIsDisabled: false
      });
    });
  }

  loadFeatureDefine = () =>{
    axios.get(`http://${window.location.hostname}:5000/static/access/feature_define.json?`+Math.random())
    .then(response => {
      let features = [];
      for(let i=0; i<response.data.length; i++){
        features.push(response.data[i]);
      }
      this.setState({
        feature_define: features
      });
    });
  }

  loadSelectedFeatureDefine = () =>{
    // console.log(this.state.corr_feature_define);
    // if(this.state.corr_feature_define.length === 0){
    //   this.setState({
    //     corr_feature_define: this.state.feature_define
    //   });
    // }else{
    //   axios.get(`http://${window.location.hostname}:5000/static/access/selected_feature_define.json?`+Math.random())
    //   .then(response => {
    //     // console.log(response);
    //     this.setState({
    //       corr_feature_define: response.data
    //     });
    //   });
    // }
    if(this.state.selected_feature_define.length === 0){
      this.setState({
        selected_feature_define: this.state.feature_define
      });
    }else{
      axios.get(`http://${window.location.hostname}:5000/static/access/selected_feature_define.json?`+Math.random())
      .then(response => {
        // console.log(response);
        this.setState({
          corr_feature_define: response.data
        });
      });
    }
  }

  loadSPMeanPath = () =>{
    axios.get(`http://${window.location.hostname}:5000/static/access/sp_heatmap_path.json?`+Math.random())
    .then(response => {
      // console.log(response);
      let _path = `http://${window.location.hostname}:5000`+response.data+"?"+Math.random();
      // console.log("sp heatmap data access path: "+_path);
      this.setState({
        spHeatmapDataURL: _path
      });
    });

    this.loadFeatureDefine();
    this.loadSelectedFeatureDefine();

    axios.get(`http://${window.location.hostname}:5000/static/access/sti_class_define.json?`+Math.random())
    .then(response => {
      let sti_class = [];
      for(let i=0; i<response.data.length; i++){
        sti_class.push(response.data[i]);
      }
      this.setState({
        sti_class_define: sti_class
      });
    });
  }
  
  loadCorrMatrixPath = () =>{
    axios.get(`http://${window.location.hostname}:5000/static/access/corr_matrix_path.json?`+Math.random())
    .then(response => {
      // console.log(response);
      let _path = `http://${window.location.hostname}:5000`+response.data+"?"+Math.random();
      // console.log("correlation data access path: "+_path);
      this.setState({
        corrMatDataURL: _path
      });
    });
  }

  loadFixationFilters = () =>{
    axios.get(`http://${window.location.hostname}:5000/static/fixation_filters.csv?`+Math.random())
    .then(response => {
      // console.log(response.data);
      let filter_options = [];
      for (let value of response.data.split('\n')){
        if(value.length>0){
          var _d = {
            "value": value.replace('\r', ''),
            "label": value.replace('\r', '')
          };
          filter_options.push(_d);
        }
      }
      // console.log(filter_options);
      this.setState({
        fixationFilters: filter_options
      });
    });
  }

  loadFeatureTypes = dataName => {
    axios.get(`http://${window.location.hostname}:5000/static/data/${dataName}/feature_types.csv`)
    .then(response => {
      const featureTypes = [];
      for (let value of response.data.split('\n')) {
        if (value.length > 0)
          featureTypes.push(value.replace('\r', ''));
      }
      this.setState({
        featureTypes: featureTypes
      });
    });
  }

  loadStimulusTypes = dataName => {
    axios.get(`http://${window.location.hostname}:5000/static/data/${dataName}/stimulus_types.csv`)
    .then(response => {
      const stimulusTypes = [];
      for (let value of response.data.split('\n')) {
        if (value.length > 0)
          stimulusTypes.push(value.replace('\r', ''));
      }
      this.setState({
        stimulusTypes: stimulusTypes
      });
    });
  }

  loadScatterAxis = () =>{
    axios.get(`http://${window.location.hostname}:5000/static/access/scatter_axis.json?`+Math.random())
    .then(response => {
      // console.log(response);
      let _axis = response.data;
      this.setState({
        scatter_axis: _axis
      });
    });
  }

  loadScatterPlotURL = () =>{
    axios.get(`http://${window.location.hostname}:5000/static/access/scatter_clustering_path.json?`+Math.random())
    .then(response => {
      // console.log(response);
      let _path = `http://${window.location.hostname}:5000`+response.data+"?"+Math.random();
      // console.log(_path);
      this.setState({
        analysisScatterURL: _path
      });
      axios.get(_path)
      .then(response => {
        let _scatterData = [];
        for (let value of response.data.split('\n')) {
          if (value.length > 0){
            if(value.split(",")[0]=="id"){
              continue;
            }
            var _row = {
              "id":value.split(",")[0], 
              "duration":value.split(",")[1], 
              "length":value.split(",")[2], 
              "x": value.split(",")[3],
              "y": value.split(",")[4],
              "clu": value.split(",")[5]
            };
            _scatterData.push(_row);
          }
        }
        let _clus = []
        for(let i=0; i<_scatterData.length; i++){
          _clus.push(parseInt(_scatterData[i]["clu"]))
        }
        // console.log(_clus);
        let _numClus = Math.max(..._clus);
        // console.log("_numClus: "+_numClus);
        this.setState({
          numCluster: _numClus
        });
        this.setState({
          patchData: _scatterData
        });
        // console.log("loadScatterPlot data");
        // console.log(_scatterData);
        this.loadFilteredData();
        // set moving cluster option
        // remove duplicated cluster number
        let _set = _clus.filter(function(a, i, self){
          return self.indexOf(a) === i;
        });
        _set.sort();
        for(let i=0; i<_set.length; i++){
          let _cluName = "c_"+i.toString();
          var _option = { 
            value: _cluName, 
            label: _cluName 
          };
          moveDestClusterOption.push(_option);
        }
        moveDestClusterOption.push({value: 'add_cluster', label: 'add cluster'});
      });
    });
  }

  loadUpdatedScatterPlotURL = () =>{
    axios.get(`http://${window.location.hostname}:5000/static/access/scatter_clustering_update_path.json?`+Math.random())
    .then(response => {
      // console.log(response);
      let _path = `http://${window.location.hostname}:5000`+response.data+"?"+Math.random();
      // console.log(_path);
      this.setState({
        updateScatterURL: _path
      });
      
    });
  }

  loadPatchURLs = () =>{
    axios.get(`http://${window.location.hostname}:5000/static/access/index_patches.json?`+Math.random())
    .then(response => {
      // console.log(response.data);
      let _paths = response.data;
      // console.log(_paths);
      this.setState({
        patchURLs: _paths
      });
    });
  }

  loadFilteredData = () =>{
    axios.get(`http://${window.location.hostname}:5000/static/access/filtered_data.csv?`+Math.random())
    .then(response => {
      // console.log("filtered data");
      let _data = [];
      for (let value of response.data.split('\n')) {
        if (value.length > 0){
          if(value.split(",")[0] === "id"){
            continue;
          }
          let _fs = [];
          let pass = 0;
          for(let _f of value.split(',')){
            if(pass<3){
              pass++;
              continue;
            }
            _fs.push(parseFloat(_f));
          }
          var _row = {
            "id": parseInt(value.split(",")[0]), 
            "duration": parseFloat(value.split(",")[1]), 
            "length": parseFloat(value.split(",")[2]), 
            "features": _fs
          };
          _data.push(_row);
        }
      }
      // console.log("loadFilteredData");
      // console.log(_data);
      this.setState({
        filteredData: _data
      });
      this.loadJoinData();
    });
  }

  loadStimulusFixation = () =>{
    axios.get(`http://${window.location.hostname}:5000/static/access/stimulus_fixations.csv?`+Math.random())
    .then(response => {
      let _stiFixData = []
      for (let value of response.data.split('\n')) {
        if (value.length > 0){
          if(value.split(",")[0] === "id"){
            continue;
          }
          var _row = {
            "id": parseInt(value.split(",")[0]), 
            "x": parseFloat(value.split(",")[1]), 
            "y": parseFloat(value.split(",")[2])
          };
          _stiFixData.push(_row);
        }
      }
      this.setState({
        stimulusData: _stiFixData
      });
    });
  }

  loadPatchFeatureImageURLs = () =>{
    axios.get(`http://${window.location.hostname}:5000/static/access/patch_feature_image.json?`+Math.random())
    .then(response => {
      // console.log(response.data);
      // let _patchFeatureImageURLs = [];
      // for (let value of response.data.split('\n')) {
      //   if (value.length > 0){
      //     _patchFeatureImageURLs.push(value);
      //   }
      // }
      this.setState({
        patchFeatureImageURLs: response.data
      });
    });
  }

  loadJoinData = () =>{
    let _dlJoinData = [];
    let _maxClusterNum = this.state.numCluster;
    let _patchData = this.state.patchData;
    let _filteredData = this.state.filteredData;
    let _cluDivData = [];
    // console.log('_maxClusterNum');
    // console.log(_maxClusterNum);
    // console.log('_patchData');
    // console.log(_patchData);
    // console.log('_filteredData');
    // console.log(_filteredData);

    for(let i=0; i<_maxClusterNum+1; i++){
      let _cluData = [];
      for(let j=0; j<_patchData.length; j++){
        if(i == _patchData[j]["clu"]){
          let _row={
            "patchDataIdx": j,
            "id": parseInt(_patchData[j]["id"]),
            "clu": parseInt(_patchData[j]["clu"]),
            "duration": parseInt(_patchData[j]["duration"]),
            "length": parseFloat(_patchData[j]["length"])
          };
          _cluData.push(_row);
        }
      }
      _cluDivData.push(_cluData);
    }
    // console.log("_cluDivData");
    // console.log(_cluDivData);

    for(let i=0; i<_cluDivData.length; i++){
      let _cluJoin = [];
      for(let j=0; j<_cluDivData[i].length; j++){
        let _id = _cluDivData[i][j]["id"];
        let _fs = [];
        for(let k=0; k<_filteredData.length; k++){
          if(_id === _filteredData[k]["id"]){
            _fs = _filteredData[k]["features"];
            break;
          }
        }
        if(_fs.length == 0){
          console.log("error: empty features")
        }

        let _row={
          "id": _cluDivData[i][j]["id"],
          "clu": _cluDivData[i][j]["clu"],
          "duration": _cluDivData[i][j]["duration"]+1,
          "length": _cluDivData[i][j]["length"],
          "features": _fs
        };
        _cluJoin.push(_row);
      }
      _dlJoinData.push(_cluJoin);
    }
    console.log("_dlJoinData");
    console.log(_dlJoinData);
    this.setState({
      joinData: _dlJoinData
    });

    // set stimulus data to pass Stimulus.js (initial patch setting)
    let _initPatch = _dlJoinData[0][0];
    console.log("_dlJoinData[0][0]");
    console.log(_dlJoinData[0][0]);
    let _ipPath = "";
    let _selectedPatchIndex = 0;
    let _patchId = 0;
    // console.log("this.state.patchURLs");
    // console.log(this.state.patchURLs);
    for(let i=0; i<this.state.patchURLs.length; i++){
      if(this.state.patchURLs[i][0] == _initPatch.id){
        // console.log("i: "+i);
        // console.log("this.state.patchURLs[i][0]");
        // console.log(this.state.patchURLs[i][0]);
        // console.log("_initPatch.id");
        // console.log(_initPatch.id);
        _patchId = this.state.patchURLs[i][0];
        _ipPath = this.state.patchURLs[i][1];
        _selectedPatchIndex = i;
        this.setState({
          selectedPatchIndex: _selectedPatchIndex
        });
        this.setState({
          selectedPatchId: _patchId
        });
        break;
      }
    }
    
    // console.log("_ipPath");
    // console.log(_ipPath);
    let _stiClass = _ipPath.split("/")[8];
    let _stiName = _ipPath.split("/")[9];
    let _fixOrder = parseInt(_ipPath.split("/")[10]);
    this.setState({
      selectedPatchOrder: _fixOrder
    });
    let _patchClu = parseInt(_dlJoinData[0][0].clu);
    this.setState({
      selectedPatchCluster: _patchClu
    });
    const _data = new FormData();
    _data.set('patchId', _patchId);
    _data.set('stimulusClass', _stiClass);
    _data.set('stimulusName', _stiName);
    _data.set('fixationOrder', _fixOrder);
    _data.set('patchCluster', _patchClu);
    axios.post(`http://${window.location.hostname}:5000/api/data/stimulus`, _data)
    .then(response => {
      if (response.data.status === 'success') {
        // load stimulus and inner fixation location with id
        this.loadStimulusFixation();
        // load patch feature image urls
        this.loadPatchFeatureImageURLs();
      } else if (response.data.status === 'failed') {
        alert(`Failed to load data - ${response.data.reason}`);
      }
    }).catch(error => {
      alert(`Error - ${error.message}`);
    });

    // make stimulus path
    axios.get(`http://${window.location.hostname}:5000/static/access/stimulus_path.json?`+Math.random())
    .then(response => {
      // console.log(response.data);
      // set stimulus path
      this.setState({
        stimulusPath: `http://${window.location.hostname}:5000`+response.data+"?"+Math.random()
      });
    }); 
  }
  

  loadPatchSelectedFeature = () =>{
    axios.get(`http://${window.location.hostname}:5000/static/access/patch_selected_feature.json?`+Math.random())
    .then(response => {
      // console.log("patch selected feature");
      // console.log(response.data);
      let _data = parseInt(response.data);
      let _patchSelectedFeature = this.state.patchSelectedFeature;
      if(_patchSelectedFeature == _data){
        // patchSelectedFeature == -1: feature unselected
        this.setState({
          patchSelectedFeature: -1
        });
      }else{
        // patchSelectedFeature != -1: feature selected
        this.setState({
          patchSelectedFeature: parseInt(response.data)
        });
      }
    });
  }

  splitDataIdUpdateFunction = () =>{
    // function for updating trainig & test dataset id

  }

  dataRecordUpdateFunction = () =>{
    // function for updating trainig & test data record
    axios.post(`http://${window.location.hostname}:5000/api/data/dataRecord`)
    .then(response => {
      if (response.data.status === 'success') {
        // update data record
        let _rec = [{
          train: response.data.datarecord.train,
          test: response.data.datarecord.test
        }];
        this.setState({
          datasetRecord: _rec
        });
      } else if (response.data.status === 'failed') {
        alert(`Failed to load data - ${response.data.reason}`);
      }
    }).catch(error => {
      alert(`Error - ${error.message}`);
    });
  }

  selectedPatchUpdate = () =>{
    axios.get(`http://${window.location.hostname}:5000/static/access/selected_patch_table_index.json?`+Math.random())
    .then(response => {
      // console.log("get selected patches table index");
      // get selected patches table index
      let _getData = response.data;
      this.setState({
        selectedPatchesTableIndex: _getData
      });
      // set last selected patch table index
      let _lastSelectedPatch = _getData[_getData.length-1]
      this.setState({
        lastSelectedPatchTableIndex: _lastSelectedPatch
      });

      // change Stimulus and Patch image
      // set patch url
      let _lastSelectedPatchID = _lastSelectedPatch[2];
      let _patchURLs = this.state.patchURLs;
      let _lastSelectedIndex = this.state.selectedPatchIndex;
      let _lpPath = "";
      let _patchId = 0;
      for(let i=0; i<_patchURLs.length; i++){
        if(_patchURLs[i][0] == _lastSelectedPatchID){
          _patchId = _patchURLs[i][0];
          _lpPath = _patchURLs[i][1];
          _lastSelectedIndex=i;
          this.setState({
            selectedPatchIndex: _lastSelectedIndex
          });
          this.setState({
            selectedPatchId: _patchId
          });
          break;
        }
      }

      let _stiClass = _lpPath.split("/")[8];
      let _stiName = _lpPath.split("/")[9];
      let _fixOrder = parseInt(_lpPath.split("/")[10]);
      this.setState({
        selectedPatchOrder: _fixOrder
      });
      let _patchClu = parseInt(_lastSelectedPatch[0]);
      this.setState({
        selectedPatchCluster: _patchClu
      });
      const _data = new FormData();
      _data.set('patchId', _patchId);
      _data.set('stimulusClass', _stiClass);
      _data.set('stimulusName', _stiName);
      _data.set('fixationOrder', _fixOrder);
      _data.set('patchCluster', _patchClu);
      axios.post(`http://${window.location.hostname}:5000/api/data/stimulus`, _data)
      .then(response => {
        if (response.data.status === 'success') {
          // load stimulus and inner fixation location with id
          this.loadStimulusFixation();
          // load patch feature image urls
          this.loadPatchFeatureImageURLs();
        } else if (response.data.status === 'failed') {
          alert(`Failed to load data - ${response.data.reason}`);
        }
      }).catch(error => {
        alert(`Error - ${error.message}`);
      });
      // make stimulus path
      axios.get(`http://${window.location.hostname}:5000/static/access/stimulus_path.json?`+Math.random())
      .then(response => {
        this.setState({
          stimulusPath: `http://${window.location.hostname}:5000`+response.data+"?"+Math.random()
        });
      });
    });
  }

  loadSubmitApi = selectedFilter =>{
    const data = new FormData();
    data.set('dataset', this.state.selectedDataset.value);
    data.set('participant', this.state.selectedParticipant.value);
    data.set('filter', selectedFilter.value);
    axios.post(`http://${window.location.hostname}:5000/api/gaze_data/submit`, data)
    .then(response => {
      if (response.data.status === 'success') {
        // console.log(response.data);
        this.setState({
          selectedFilterName: response.data.filterName
        });
        this.loadSPMeanPath();
        // alert('Data loaded');
        // console.log(response.data);
        this.loadCorrMatrixPath();
        this.loadFeatureDefine();
      } else if (response.data.status === 'failed') {
        alert(`Failed to load data - ${response.data.reason}`);
      }
    }).catch(error => {
      alert(`Error - ${error.message}`);
    });
  }

  componentDidMount() {
    this.loadDatasetList();
    this.loadFixationFilters();
  }

  onDataChanged = e => {
    const dataName = e.currentTarget.value;
    this.loadFeatureTypes(dataName);
    this.loadStimulusTypes(dataName);
  }

  datasetChange = selectedDataset => {
    this.setState({selectedDataset});
    // console.log(selectedDataset.value);
    this.loadParticipantsList(selectedDataset.value);
  };

  participantChange = selectedParticipant => {
    this.setState({selectedParticipant});
    // console.log(selectedParticipant.value);
    this.setState({
      fIsDisabled: false
    });
  }

  filterChange = selectedFilter => {
    this.setState({selectedFilter});
    // console.log(selectedFilter.value);
    this.loadSubmitApi(selectedFilter);
    this.setState({
      dtfSelectDisableFlag: false
    });
  };

  pMethodChange = selectedProcessMethod => {
    this.setState({selectedProcessMethod});
  }

  cMethodChange = selectedCorrelationMethod => {
    this.setState({selectedCorrelationMethod});
    
    const data = new FormData();
    data.set('processing', this.state.selectedProcessMethod.value);
    data.set('correlation', selectedCorrelationMethod.value);
    axios.post(`http://${window.location.hostname}:5000/api/data/process`, data)
    .then(response => {
      if (response.data.status === 'success') {
        // alert('Data pre-processing and correlation methods aplied');
        // console.log('Data pre-processing and correlation methods aplied');
        this.loadCorrMatrixPath();
        // load selected features define
        this.loadSelectedFeatureDefine();
      } else if (response.data.status === 'failed') {
        alert(`Failed apply data pre-processing and correlation methods - ${response.data.reason}`);
      }
    }).catch(error => {
      alert(`Error - ${error.message}`);
    });
  }

  patchSelectOptionChanged = selectedPatchSelectOption =>{
    this.setState({selectedPatchSelectOption});
    if(selectedPatchSelectOption.value == 'similar'){
      this.setState({
        similarDisabled: false
      });
    }else{
      this.setState({
        similarDisabled: true
      });
    }
  }

  similarityOptionChanged = selectedSimilarityOption =>{
    this.setState({selectedSimilarityOption});
    let _patchSelectedFeature = this.state.patchSelectedFeature;
    let _selectedSimilarityOption = selectedSimilarityOption.value;
    const data = new FormData();
    data.set('selectedFeature', _patchSelectedFeature);
    data.set('selectedSimilarityOption', _selectedSimilarityOption);
    // patchIds
    axios.post(`http://${window.location.hostname}:5000/api/data/similarity`, data)
    .then(response => {
      console.log("get patches calculated similarity values");
      // get sorted similarity values with id
      axios.get(`http://${window.location.hostname}:5000/static/access/similarity_scores_sorting.json?`+Math.random())
      .then(response => {
        console.log(response.data);
        let simIds = [];
        let simIdsTh = [];
        for(let i=0; i<response.data.length; i++){
          let _simPatch = {
            id: response.data[i][0],
            score: response.data[i][1]
          };
          simIds.push(_simPatch);
          if(parseFloat(response.data[i][1]) > SIMILARITY_THRESHOLD){
            simIdsTh.push(_simPatch);
          }
        }
        this.setState({
          similarPatchesId: simIds
        });
        this.setState({
          similarPatchList: simIdsTh
        });
      })
      .then(()=>{
        axios.get(`http://${window.location.hostname}:5000/static/access/updated_ordered_patch.json?`+Math.random())
        .then(response => {
          console.log(response.data);
          let _updatePatch = [];
          for(let i=0; i<response.data.length; i++){
            let _patch = {
              clu: response.data[i][0],
              order: response.data[i][1],
              id: response.data[i][2]
            };
            _updatePatch.push(_patch);
          }
        }); 
      });
    }).catch(error => {
      alert(`Error - ${error.message}`);
    });
  }

  moveDestOptionChanged = selectedMoveDestination =>{
    this.setState({selectedMoveDestination});
    
    const data = new FormData();
    data.set('destination', selectedMoveDestination.value);
    axios.post(`http://${window.location.hostname}:5000/api/data/movePatch`, data)
    .then(response => {
      if (response.data.status === 'success') {
        console.log('move patch');
      } else if (response.data.status === 'failed') {
        alert(`Failed apply data pre-processing and correlation methods - ${response.data.reason}`);
      }
    }).then(()=>{
      this.updatePatchData();
      this.loadUpdatedScatterPlotURL();
    }).catch(error => {
      alert(`Error - ${error.message}`);
    });
  }

  updatePatchData = () =>{
    axios.get(`http://${window.location.hostname}:5000/static/access/updated_ordered_patch.json?`+Math.random())
    .then(response => {
      let updatedPatchClu = response.data;
      let targetPatchData = this.state.patchData;
      // console.log('updatedPatchClu');
      // console.log(updatedPatchClu);
      // console.log('targetPatchData');
      // console.log(targetPatchData);
      let changeFlag = 0;
      for(let i=0; i<updatedPatchClu.length; i++){
        let _targetId = updatedPatchClu[i][2];
        let _updatedClu = updatedPatchClu[i][0];
        for(let j=0; j<targetPatchData.length; j++){
          let _patchId = targetPatchData[j].id;
          if(parseInt(_patchId) == _targetId){
            targetPatchData[j].clu = _updatedClu;
            changeFlag += 1;
            break;
          }
        }
      }

      let _maxClu = 0;
      for(let i=0; i<targetPatchData.length; i++){
        let _clu = targetPatchData[i].clu;
        if(_maxClu < _clu){
          _maxClu = _clu;
        }
      }
      // console.log('this.state.numCluster');
      // console.log(this.state.numCluster);
      // console.log('_maxClu');
      // console.log(_maxClu);
      if(_maxClu > this.state.numCluster){
        this.setState({
          numCluster: _maxClu
        });
      }

      let updatedPatchData = [];
      // console.log('targetPatchData');
      // console.log(targetPatchData);
      for(let i=0; i<targetPatchData.length; i++){
        updatedPatchData.push(targetPatchData[i]);
      }
      // for(let i=0; i<this.state.numCluster+1; i++){
      //   let _cluData = []
      //   for(let j=0; j<targetPatchData.length; j++){
      //     if(i == targetPatchData[j].clu){
      //       let _d = {
      //         "id":targetPatchData[j].id, 
      //         "duration":targetPatchData[j].duration, 
      //         "length":targetPatchData[j].length, 
      //         "x": targetPatchData[j].x,
      //         "y": targetPatchData[j].y,
      //         "clu": targetPatchData[j].clu
      //       };
      //       _cluData.push(_d);
      //     }
      //   }
      //   updatedPatchData.push(_cluData);
      // }
      // console.log('changeFlag');
      // console.log(changeFlag);
      if(changeFlag>0){
        // console.log("setstate patchdata");
        this.setState({
          patchData: updatedPatchData
        });
        console.log('this.state.patchData');
        console.log(this.state.patchData);
      }
    });
  }

  dataTransformationOptionChanged = selectedDataTransformation =>{
    this.setState({selectedDataTransformation});
    // load selected features define
    this.loadSelectedFeatureDefine();

    const _emptyData = new FormData();
    axios.post(`http://${window.location.hostname}:5000/api/data/select/filtering`, _emptyData)
    .then(response => {
      // console.log(response);
      this.setState({
        drSelectDisableFlag: false
      });
    }).catch(error => {
      alert(`Error - ${error.message}`);
      this.setState({
        drSelectDisableFlag: true
      });
    });
  }
  dimensionReductionOptionChanged = selectedDimensionReduction =>{
    this.setState({selectedDimensionReduction});
    this.setState({
      cluSelectDisableFlag: false
    });
  }
  clusteringAlgorithmOptionChanged = selectedClusteringAlgorithm =>{
    this.setState({selectedClusteringAlgorithm});

    let _dataTransformationMethod = this.state.selectedDataTransformation.value;
    let _dimensionReductionMethod = this.state.selectedDimensionReduction.value;
    let _clusteringMethod = selectedClusteringAlgorithm.value;
    const data = new FormData();
    data.set('selectedTransformationOption', _dataTransformationMethod);
    data.set('selectedDimensionReductionOption', _dimensionReductionMethod);
    data.set('selectedClusteringOption', _clusteringMethod);
    axios.post(`http://${window.location.hostname}:5000/api/data/tfrmcluProcessing`, data)
    .then(response => {
      // console.log("data transformation applied");
      // load scatter plot url
      this.loadScatterPlotURL();
      // load all patches url
      this.loadPatchURLs();

    }).catch(error => {
      alert(`Error - ${error.message}`);
    });
  }

  visStyleChanged = selectedVisStyle => {
    this.setState({selectedVisStyle});
    if(selectedVisStyle.value == 'scatterplot'){
      this.setState({
        nodeSelectDisabledFlag: false
      });
    }else{
      this.setState({
        nodeSelectDisabledFlag: true
      });
    }
  }
  nodeStyleChanged = selectedNodeStyle => {
    this.setState({selectedNodeStyle});
  }
  
  loadScanpathData = () =>{
    if(this.state.selectedTempOption.value == 'scanpath'){
      const data = new FormData();
      axios.post(`http://${window.location.hostname}:5000/api/data/scanpath`, data)
      .then(response => {
        console.log(response.data);
        var _sData = response.data.scanpath;

        var _sList = [];
        for(let i=0; i<_sData.length; i++){
          var _path = [];
          for(let j=0; j<_sData[i].length; j++){
            var _fix = {
              'x': _sData[i][j][0],
              'y': _sData[i][j][1]
            };
            _path.push(_fix);
          }
          _sList.push(_path);
        }
        this.setState=({
          scanpathData: _sList
        });
        console.log(_sList);
      })
      .then(()=>{
        const data = new FormData();
        axios.post(`http://${window.location.hostname}:5000/api/scanpath/sim`, data)
        .then(response => {
          console.log(response.data);
        }).catch(error => {
          alert(`Error - ${error.message}`);
        });
        
      })
      .catch(error => {
        alert(`Error - ${error.message}`);
      });
    }else{
      console.log("test");
    }
  }
  scanpathSelectChanged = selectedTempOption => {
    this.setState({selectedTempOption});
    if(selectedTempOption.value == 'scanpath'){
      const data = new FormData();
      axios.post(`http://${window.location.hostname}:5000/api/data/scanpath`, data)
      .then(response => {
        console.log(response.data);
        var _sData = response.data.scanpath;

        var _sList = [];
        for(let i=0; i<_sData.length; i++){
          var _path = [];
          for(let j=0; j<_sData[i].length; j++){
            var _fix = {
              'x': _sData[i][j][0],
              'y': _sData[i][j][1]
            };
            _path.push(_fix);
          }
          _sList.push(_path);
        }
        this.setState({
          scanpathData: _sList
        });
        console.log(_sList);
      })
      .then(()=>{
        const data = new FormData();
        axios.post(`http://${window.location.hostname}:5000/api/scanpath/sim`, data)
        .then(response => {
          console.log(response.data);
          this.setState({
            scanpathSimClu: response.data.similarityclu
          });
        }).catch(error => {
          alert(`Error - ${error.message}`);
        });
      })
      .then(()=>{
        this.setState({similaritySelectDeisableFlag: false});
      })
      .catch(error => {
        alert(`Error - ${error.message}`);
      });
    }
  }
  scanpathSimilarityChanged = selectSimilarityMethodOption => {
    this.setState({selectSimilarityMethodOption});
    let _scanpathSimData = [];
    for(let i=0; i<this.state.scanpathData.length; i++){
      var simClu = [];
      for(let j=0; j<this.state.scanpathSimClu.length; j++){
        if(this.state.scanpathSimClu[j].method == selectSimilarityMethodOption.value){
          simClu = this.state.scanpathSimClu[j].clu;
          break;
        }
      }
      var _scanpthCluVal = 0;
      if(i==0){
        _scanpthCluVal = 2;
      }else{
        _scanpthCluVal = simClu[i-1];
      }
      var _scan ={
        'scanpath': this.state.scanpathData[i],
        'clu': _scanpthCluVal
      };
      _scanpathSimData.push(_scan);
    }
    console.log(_scanpathSimData);
    this.setState({
      scanpathSimData: _scanpathSimData
    });
    this.setState({stimulusSwitchDisableFlag: false});
  }

  stimulusSwitchChanged = selectedStimulusSwitchOption => {
    this.setState({selectedStimulusSwitchOption});
  }

  

  render() {
    const { datasetList, selectedDataset, pIsDisabled, fIsDisabled, participants, selectedParticipant, fixationFilters, selectedFilter, selectedFilterName } = this.state;
    const { spHeatmapDataURL, datasetRecord } = this.state;
    const { selectedDataTransformation, selectedDimensionReduction, selectedClusteringAlgorithm } = this.state;
    const { feature_define, sti_class_define, selected_feature_define } = this.state;
    const { analysisScatterURL, patchURLs, numCluster, patchData, similarPatchList, selectedMoveDestination } = this.state;
    const { stimulusData, stimulusPath, selectedPatchIndex, patchFeatureImageURLs, selectedPatchOrder, selectedPatchCluster, patchSelectedFeature, selectedPatchId,  selectedPatchSelectOption} = this.state
    const { selectedSimilarityOption, similarDisabled } = this.state;
    const { selectedVisStyle, selectedNodeStyle, nodeSelectDisabledFlag, nodeSizeSpinnerValue } = this.state;
    const { dtfSelectDisableFlag, drSelectDisableFlag, cluSelectDisableFlag } = this.state;
    // const { selectedProcessMethod, selectedCorrelationMethod, corrMatDataURL, scatter_axis, corr_feature_define, filteredData, joinData, updateScatterURL } = this.state;
    const { selectedTempOption, selectedStimulusSwitchOption, scanpathData, scanpathSimData, stimulusSwitchDisableFlag,  selectSimilarityMethodOption, similaritySelectDeisableFlag} = this.state;
    return (
      <>
      {/* col 1*/}
      <div className="inputBoxWrap">
        <div className="page-header">
          <div id="logo"></div><div><h3>Title Area</h3></div>
        </div>
        <div className="page-section select-data">
          <Select 
            value={selectedDataset}
            onChange={this.datasetChange}
            options={datasetList}
            placeholder="Stimulus Dataset"
          />
        </div>
        <div className="page-section select-participant">
          <Select 
            isDisabled={pIsDisabled}
            value={selectedParticipant}
            onChange={this.participantChange}
            options={participants}
            placeholder="Participant data"
          />
        </div>
        <div className="page-section select-filter">
          <Select 
            isDisabled={fIsDisabled}
            value={selectedFilter}
            onChange={this.filterChange}
            options={fixationFilters}
            placeholder="Eye movement event filter"
          />
        </div>
        <div className="section-header">
          <h4>Spatial Variance Matrix</h4>
        </div>
        {spHeatmapDataURL.length > 0 &&
          <div id="heat" className="page-section heatmap">
            <Heatmap 
              width={400}
              height={300}
              dataURL={spHeatmapDataURL}
              FEATURE_DEFINE={feature_define}
              STI_CLASS_DEFINE={sti_class_define}
              dataRecordUpdate={this.dataRecordUpdateFunction}
            />
          </div>
        }
        <div className="section-header">
          <h4> Data overview </h4>
        </div>
        {datasetRecord.length > 0 &&
          <div className="ag-theme-alpine" style={ { width: 395, height: 75 } }>
            <AgGridReact
              rowData={datasetRecord}
              suppressHorizontalScroll={true}
              headerHeight={'30'}>
              <AgGridColumn headerName="#Training data record" field="train"></AgGridColumn>
              <AgGridColumn headerName="#Test data record" field="test"></AgGridColumn>
            </AgGridReact>
          </div>
        }
        <div className="page-section">
          <Select 
            value={selectedTempOption}
            onChange={this.scanpathSelectChanged}
            options={tempSelectOption}
          />
        </div>
        <div className="page-section">
          <Select
            isDisabled={stimulusSwitchDisableFlag}
            value={selectedStimulusSwitchOption}
            onChange={this.stimulusSwitchChanged}
            options={stimulusSwitchSelectOption}
          />
        </div>
        <div className="page-section">
          <Select
            isDisabled={similaritySelectDeisableFlag}
            value={selectSimilarityMethodOption}
            onChange={this.scanpathSimilarityChanged}
            options={scanpathSimilaritySelectOption}
          />
        </div>

        {/* {spHeatmapDataURL.length > 0 &&
          <div className="page-section select-process ">
            <Select
              value={selectedProcessMethod}
              onChange={this.pMethodChange}
              options={dataProcessingMethods}
              placeholder="Data processing"
            />
          </div>
        }
        {spHeatmapDataURL.length > 0 &&
          <div className="page-section select-correlation ">
            <Select
              value={selectedCorrelationMethod}
              onChange={this.cMethodChange}
              options={correlationMethods}
              placeholder="Correlation method"
            />
          </div>
        }
        <div className="section-header">
          <h4> Correlation Matrix </h4>
        </div>
        {corrMatDataURL.length > 0 &&
          <div id="corr" className="page-section correlation">
            <CorrelationMatrix 
              width={400}
              height={400}
              dataURL={corrMatDataURL}
              features={corr_feature_define}
              onAxisChanged={this.loadScatterAxis}
            />
          </div>  
        } */}

        <div className="section-header">
          <h4> Clustering result 1 </h4>
        </div>
        <Select
          value={selectedDataTransformation}
          isDisabled={dtfSelectDisableFlag}
          onChange={this.dataTransformationOptionChanged}
          options={dataTransformation}
          placeholder="Data transformation"
        />
        <Select
          value={selectedDimensionReduction}
          isDisabled={drSelectDisableFlag}
          onChange={this.dimensionReductionOptionChanged}
          options={dimensionalityReduction}
          placeholder="Dimensionality reduction"
        />
        <Select
          value={selectedClusteringAlgorithm}
          isDisabled={cluSelectDisableFlag}
          onChange={this.clusteringAlgorithmOptionChanged}
          options={clusteringAlgorithm}
          placeholder="Clustering algorithm"
        />
        {analysisScatterURL.length > 0 &&
          <div id="analysis" className="page-section">
            <ClusteringScatterPlot 
              width={400}
              height={350}
              dataURL={analysisScatterURL}
            />
          </div>
        }
      </div>
      
      {/* col 2*/}
      {/* <div className="dataAbstractWrap">
        <div className="section-header">
          <h4> Selected feature </h4>
        </div>
        <div className="page-section">
          <ScatterPlot
            width={400}
            height={400}
            axis={scatter_axis}
            dataURL={`http://${window.location.hostname}:5000/static/access/scatter_data.csv?`+Math.random()}
          />
        </div>
        
        <div className="section-header">
          <h4> Clustering result 2 </h4>
        </div>
        <Select
          options={dataTransformation}
          placeholder="Data transformation"
        />
        <Select
          options={dimensionalityReduction}
          placeholder="Dimensionality reduction"
        />
        <Select
          options={clusteringAlgorithm}
          placeholder="Clustering algorithm"
        />
        {updateScatterURL.length > 0 &&
          <div className="page-section">
            <AnalysisScatter 
              width={400}
              height={350}
              dataURL={updateScatterURL}
              filteredData={filteredData}
            />
          </div>
        }
      </div> */}

      {/* col 3*/}
      <div className="dataVisualizationWrap">
        <div className="section-header">
          <h4> Patch Clustering Visualization </h4>
        </div>
        <div className="visControlClass">
          <div className="visSelect">
          <Select 
            value={selectedVisStyle}
            onChange={this.visStyleChanged}
            options={patchVisualizationStyle}
            placeholder="Visualization Style"
            // defaultInputValue="Clustering Table"
          />
          </div>
          <div className="nodeSelect">
          <Select 
            value={selectedNodeStyle}
            isDisabled={nodeSelectDisabledFlag}
            onChange={this.nodeStyleChanged}
            options={patchNodeStyle}
            placeholder="Node Style"
            // defaultInputValue="Cluster"
          />
          </div>
          <div className="nodeSizeSpinner">
            <InputNumber
              width={100}
              min={10}
              step={1}
              value={nodeSizeSpinnerValue}
              onChange={this.nodeSizeChanged}
            />
          </div>
          <div className="featureSelect">
          <Select 
            options={patchNodeStyle}
            placeholder="Features"
          />
          </div>
        </div>
        {patchURLs.length > 0 && numCluster != 0 && patchData.length != 0 &&
          <div className="page-section">
            {/* <PatchTable 
              width={900}
              height={780}
              patchURLs={patchURLs}
              patchScatterData={patchData}
              numClusters={numCluster}
              features={corr_feature_define}
              filteredData={filteredData}
              passSelectedFeature={this.loadPatchSelectedFeature}
              selectedPatchUpdate={this.selectedPatchUpdate}
              similarPatchList={similarPatchList}
            /> */}
            <PatchVisualization 
              width={900}
              height={760}
              visStyle={selectedVisStyle.value}
              nodeStyle={selectedNodeStyle.value}
              nodeSpinnerSize={nodeSizeSpinnerValue}
              patchURLs={patchURLs}
              patchScatterData={patchData}
              numClusters={numCluster}
              features={selected_feature_define}
              selectedPatchUpdate={this.selectedPatchUpdate}
              similarPatchList={similarPatchList}
            />
          </div>
        }
        <div className="stimulusDivsWrap">
          <div className="stimulusClass">
            <div className="section-header">
              <h4>Stimulus view</h4>
            </div>
            {stimulusData.length>0 && stimulusPath.length>0 &&
              <Stimulus 
                width={400}
                height={300}
                stimulusData={stimulusData}
                stimulusPath={stimulusPath}
                selectedPatchOrder={selectedPatchOrder}
                patchCluster={selectedPatchCluster}
              />
            }
          </div>
          <div className="patchClass">
            <div className="section-header">
              <h4>Patch view</h4>
            </div>
            {patchURLs.length>0 && patchFeatureImageURLs.length>0 &&
              <Patch 
                width={235}
                height={300}
                patchURL={patchURLs[selectedPatchIndex]}
                patchCluster={selectedPatchCluster}
                patchFeatureImageURLs={patchFeatureImageURLs}
                patchSelectedFeature={patchSelectedFeature}
                feature_define={feature_define}
                dataset={selectedDataset.value}
                participant={selectedParticipant.value}
                filterName={selectedFilterName}
                selectedPatchId={selectedPatchId}
              />
            }
          </div>
          <div className="functionClass">
            <div className="section-header">
              <h4>Functions</h4>
            </div>
            <Select
              value={selectedPatchSelectOption}
              onChange={this.patchSelectOptionChanged}
              options={patchSelectOption}
              placeholder="Select option"
            />
            <Select 
              value={selectedSimilarityOption}
              isDisabled={similarDisabled}
              onChange={this.similarityOptionChanged}
              options={imageSimilarityOption}
              placeholder="Similarity option"
            />
            <h4>Move to</h4>
            {moveDestClusterOption.length > 0 &&
            <Select
              value={selectedMoveDestination}
              onChange={this.moveDestOptionChanged}
              options={moveDestClusterOption}
              placeholder="Moving option"
            />
            }
          </div>
        </div>
      </div>

      {/* col 4*/}
      {/* <div className="dataResultWrap">
        <div className="section-header">
          <h4> Box plot: duration </h4>
        </div>
        {joinData.length > 0 &&
          <div className="page-section">
            <DurationBoxPlot 
              width={450}
              height={200}
              getData={joinData}
            />
          </div>
        }
        <div className="section-header">
          <h4> Box plot: saccade length </h4>
        </div>
        {joinData.length > 0 &&
          <div className="page-section">
            <LengthBoxPlot 
              width={450}
              height={200}
              getData={joinData}
            />
          </div>
        }
      </div> */}
        <div className="visWarp">
        {selectedStimulusSwitchOption != null && scanpathSimData.length != 0 &&
          <ScanpathVisualization
            width={960}
            height={550}
            scanpathList={scanpathSimData}
            stimulusSwitch={selectedStimulusSwitchOption.value}
          />
          }
        </div>
      </>
    );
  }
}

export default Data;
